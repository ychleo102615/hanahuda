import { GameViewModel } from '../../domain/models/GameViewModel'
import type { PlayerViewModel } from '../../domain/models/PlayerViewModel'
import { createPlayerViewModel, updatePlayerViewModel } from '../../domain/models/PlayerViewModel'
import type { IUIPresenter } from '../ports/IUIPresenter'
import type { IntegrationEvent } from '@/shared/events/base/IntegrationEvent'
import type { GameInitializedEvent } from '@/shared/events/game/GameInitializedEvent'
import type { CardPlayedEvent } from '@/shared/events/game/CardPlayedEvent'
import type { MatchSelectedEvent } from '@/shared/events/game/MatchSelectedEvent'
import type { KoikoiDeclaredEvent } from '@/shared/events/game/KoikoiDeclaredEvent'
import type { RoundEndedEvent } from '@/shared/events/game/RoundEndedEvent'
import type { GameEndedEvent } from '@/shared/events/game/GameEndedEvent'

/**
 * Update Game View Use Case (Game UI BC)
 *
 * Responsible for:
 * - Processing integration events from game-engine BC
 * - Updating GameViewModel incrementally
 * - Detecting missing events and requesting full sync
 * - Presenting updates to UI through IUIPresenter
 *
 * Design:
 * - Event-driven architecture
 * - Immutable state updates (GameViewModel returns new instances)
 * - Sequence number validation
 */
export class UpdateGameViewUseCase {
  private gameViewModel: GameViewModel | null = null
  private readonly SEQUENCE_GAP_THRESHOLD = 1

  constructor(private readonly presenter: IUIPresenter) {}

  /**
   * Get current game view model
   */
  getGameViewModel(): GameViewModel | null {
    return this.gameViewModel
  }

  /**
   * Process an integration event
   */
  async handleEvent(event: IntegrationEvent): Promise<void> {
    // Check for missing events (sequence gap detection)
    if (this.gameViewModel && this.shouldRequestSync(event)) {
      console.warn(
        `Event sequence gap detected. Expected: ${this.gameViewModel.lastEventSequence + 1}, Got: ${event.sequenceNumber}`
      )
      // In production, this would trigger a full sync request
      // For now, we'll continue processing
    }

    // Route to appropriate handler based on event type
    switch (event.eventType) {
      case 'GameInitialized':
        await this.handleGameInitialized(event as GameInitializedEvent)
        break

      case 'CardPlayed':
        await this.handleCardPlayed(event as CardPlayedEvent)
        break

      case 'MatchSelected':
        await this.handleMatchSelected(event as MatchSelectedEvent)
        break

      case 'KoikoiDeclared':
        await this.handleKoikoiDeclared(event as KoikoiDeclaredEvent)
        break

      case 'RoundEnded':
        await this.handleRoundEnded(event as RoundEndedEvent)
        break

      case 'GameEnded':
        await this.handleGameEnded(event as GameEndedEvent)
        break

      default:
        console.warn(`Unknown event type: ${event.eventType}`)
    }
  }

  /**
   * Handle GameInitializedEvent - Full state snapshot
   */
  private async handleGameInitialized(event: GameInitializedEvent): Promise<void> {
    const { gameState, cardDefinitions, turnTransition } = event

    // Create player view models
    const players: PlayerViewModel[] = gameState.players.map((p) =>
      createPlayerViewModel(
        p.id,
        p.name,
        p.handCardIds,
        p.capturedCardIds,
        p.totalScore,
        p.roundScore,
        p.id === gameState.currentPlayerId,
        p.id === gameState.koikoiPlayerId,
        true // isHuman - would need additional info in production
      )
    )

    // Create game view model
    this.gameViewModel = new GameViewModel(
      gameState.gameId,
      gameState.currentRound,
      gameState.phase,
      gameState.currentPlayerId,
      players,
      gameState.fieldCardIds,
      gameState.deckCardCount,
      gameState.koikoiPlayerId,
      cardDefinitions,
      event.sequenceNumber
    )

    // Present to UI
    this.presenter.presentGameState(this.gameViewModel)
    this.presenter.presentMessage('game.messages.gameInitialized')
  }

  /**
   * Handle CardPlayedEvent - Incremental update
   */
  private async handleCardPlayed(event: CardPlayedEvent): Promise<void> {
    if (!this.gameViewModel) {
      console.error('Cannot process CardPlayed event without initialized game')
      return
    }

    const { playerId, playedCardId, handMatch, deckMatch, turnTransition } = event

    let updatedViewModel = this.gameViewModel.withEventSequence(event.sequenceNumber)

    // Update player's hand (remove played card)
    updatedViewModel = this.updatePlayerHand(updatedViewModel, playerId, playedCardId)

    // Process hand match
    updatedViewModel = this.processMatch(updatedViewModel, playerId, handMatch)

    // Process deck match
    updatedViewModel = this.processMatch(updatedViewModel, playerId, deckMatch)

    // Update deck count
    updatedViewModel = updatedViewModel.withDeckCount(updatedViewModel.deckCardCount - 1)

    // Handle turn transition (if any)
    if (turnTransition) {
      updatedViewModel = updatedViewModel.withCurrentPlayer(turnTransition.currentPlayerId)

      // Update player view models to reflect current player change
      const updatedPlayers = updatedViewModel.players.map(p =>
        updatePlayerViewModel(p, { isCurrentPlayer: p.id === turnTransition.currentPlayerId })
      )
      updatedViewModel = updatedViewModel.withPlayers(updatedPlayers)

      this.presenter.presentTurnTransition(
        turnTransition.previousPlayerId || playerId,
        turnTransition.currentPlayerId,
        turnTransition.reason
      )
    }

    // Check for yaku achievements
    const allYaku = [...handMatch.achievedYaku, ...deckMatch.achievedYaku]
    if (allYaku.length > 0) {
      updatedViewModel = updatedViewModel.withYakuResults(allYaku)
      this.presenter.presentYakuAchievement(playerId, allYaku)

      // If no turn transition, player needs to make Koi-Koi decision
      if (!turnTransition) {
        updatedViewModel = updatedViewModel.withPhase('koikoi')
        this.presenter.presentKoikoiDialog(playerId, allYaku, this.calculateYakuScore(allYaku))
      }
    }

    // Check for multiple match selection required
    if (handMatch.matchType === 'multiple_matches' && !handMatch.selectedFieldCardId) {
      updatedViewModel = updatedViewModel.withPendingMatchSelection({
        playerId,
        sourceCardId: handMatch.sourceCardId,
        sourceType: 'hand',
        selectableFieldCardIds: handMatch.selectableFieldCardIds || [],
        timeoutMs: handMatch.selectionTimeout || 10000,
        startedAt: Date.now(),
      })
      this.presenter.presentMatchSelection(
        handMatch.sourceCardId,
        handMatch.selectableFieldCardIds || [],
        handMatch.selectionTimeout || 10000
      )
    } else if (deckMatch.matchType === 'multiple_matches' && !deckMatch.selectedFieldCardId) {
      updatedViewModel = updatedViewModel.withPendingMatchSelection({
        playerId,
        sourceCardId: deckMatch.sourceCardId,
        sourceType: 'deck',
        selectableFieldCardIds: deckMatch.selectableFieldCardIds || [],
        timeoutMs: deckMatch.selectionTimeout || 10000,
        startedAt: Date.now(),
      })
      this.presenter.presentMatchSelection(
        deckMatch.sourceCardId,
        deckMatch.selectableFieldCardIds || [],
        deckMatch.selectionTimeout || 10000
      )
    }

    this.gameViewModel = updatedViewModel
    this.presenter.presentStateUpdate(updatedViewModel)
    this.presenter.presentCardPlayAnimation(playerId, playedCardId, handMatch)
    this.presenter.presentDeckRevealAnimation(deckMatch.sourceCardId, deckMatch)
  }

  /**
   * Handle MatchSelectedEvent
   */
  private async handleMatchSelected(event: MatchSelectedEvent): Promise<void> {
    if (!this.gameViewModel) {
      console.error('Cannot process MatchSelected event without initialized game')
      return
    }

    let updatedViewModel = this.gameViewModel
      .withEventSequence(event.sequenceNumber)
      .withPendingMatchSelection(null)

    // Update field cards (remove selected card)
    const newFieldCardIds = updatedViewModel.fieldCardIds.filter(
      (id) => id !== event.selectedFieldCardId
    )
    updatedViewModel = updatedViewModel.withFieldCards(newFieldCardIds)

    // Add captured cards to player
    updatedViewModel = this.updatePlayerCaptured(
      updatedViewModel,
      event.playerId,
      event.capturedCardIds
    )

    // Handle turn transition
    updatedViewModel = updatedViewModel.withCurrentPlayer(event.turnTransition.currentPlayerId)

    const updatedPlayers = updatedViewModel.players.map(p =>
      updatePlayerViewModel(p, { isCurrentPlayer: p.id === event.turnTransition.currentPlayerId })
    )
    updatedViewModel = updatedViewModel.withPlayers(updatedPlayers)

    this.presenter.presentTurnTransition(
      event.turnTransition.previousPlayerId || event.playerId,
      event.turnTransition.currentPlayerId,
      event.turnTransition.reason
    )

    // Check for yaku achievements
    if (event.achievedYaku.length > 0) {
      updatedViewModel = updatedViewModel.withYakuResults(event.achievedYaku)
      this.presenter.presentYakuAchievement(event.playerId, event.achievedYaku)
    }

    this.gameViewModel = updatedViewModel
    this.presenter.clearMatchSelection()
    this.presenter.presentStateUpdate(updatedViewModel)
  }

  /**
   * Handle KoikoiDeclaredEvent
   */
  private async handleKoikoiDeclared(event: KoikoiDeclaredEvent): Promise<void> {
    if (!this.gameViewModel) {
      console.error('Cannot process KoikoiDeclared event without initialized game')
      return
    }

    let updatedViewModel = this.gameViewModel
      .withEventSequence(event.sequenceNumber)
      .withYakuResults([]) // Clear yaku display

    if (event.continueGame) {
      // Player declared Koi-Koi
      updatedViewModel = updatedViewModel
        .withKoikoiPlayer(event.playerId)
        .withPhase('playing')

      // Update player view model
      const updatedPlayers = updatedViewModel.players.map(p =>
        updatePlayerViewModel(p, { hasKoikoi: p.id === event.playerId })
      )
      updatedViewModel = updatedViewModel.withPlayers(updatedPlayers)

      this.presenter.presentMessage('game.messages.koikoiDeclared', {
        playerName: updatedViewModel.getPlayer(event.playerId)?.name || '',
      })
    } else {
      // Player stopped, round ends
      updatedViewModel = updatedViewModel.withPhase('round_end')
      this.presenter.presentMessage('game.messages.roundEnding')
    }

    // Handle turn transition
    updatedViewModel = updatedViewModel.withCurrentPlayer(event.turnTransition.currentPlayerId)

    const updatedPlayers = updatedViewModel.players.map(p =>
      updatePlayerViewModel(p, { isCurrentPlayer: p.id === event.turnTransition.currentPlayerId })
    )
    updatedViewModel = updatedViewModel.withPlayers(updatedPlayers)

    this.presenter.presentTurnTransition(
      event.turnTransition.previousPlayerId || event.playerId,
      event.turnTransition.currentPlayerId,
      event.turnTransition.reason
    )

    this.gameViewModel = updatedViewModel
    this.presenter.clearKoikoiDialog()
    this.presenter.presentStateUpdate(updatedViewModel)
  }

  /**
   * Handle RoundEndedEvent
   */
  private async handleRoundEnded(event: RoundEndedEvent): Promise<void> {
    if (!this.gameViewModel) {
      console.error('Cannot process RoundEnded event without initialized game')
      return
    }

    const updatedViewModel = this.gameViewModel
      .withEventSequence(event.sequenceNumber)
      .withPhase('round_end')

    this.gameViewModel = updatedViewModel

    // Present round end summary
    const winnerName = event.winnerId
      ? updatedViewModel.getPlayer(event.winnerId)?.name || null
      : null

    // Find winner's score
    const winnerScore = event.winnerId
      ? event.roundScores.find((s) => s.playerId === event.winnerId)?.score || 0
      : 0

    this.presenter.presentRoundEnd(
      event.winnerId,
      winnerName,
      winnerScore,
      event.winningYaku
    )
  }

  /**
   * Handle GameEndedEvent
   */
  private async handleGameEnded(event: GameEndedEvent): Promise<void> {
    if (!this.gameViewModel) {
      console.error('Cannot process GameEnded event without initialized game')
      return
    }

    const updatedViewModel = this.gameViewModel
      .withEventSequence(event.sequenceNumber)
      .withPhase('game_end')

    this.gameViewModel = updatedViewModel

    // Find winner with highest score
    const winnerScore = event.finalScores.find((s) => s.playerId === event.winnerId)
    const winnerName = event.winnerId
      ? updatedViewModel.getPlayer(event.winnerId)?.name || null
      : null

    this.presenter.presentGameEnd(
      event.winnerId,
      winnerName,
      winnerScore?.totalScore || 0,
      event.totalRounds
    )
  }

  // ==================== Helper Methods ====================

  /**
   * Check if full sync is needed (sequence gap detection)
   */
  private shouldRequestSync(event: IntegrationEvent): boolean {
    if (!this.gameViewModel) return false
    const expectedSequence = this.gameViewModel.lastEventSequence + 1
    const gap = event.sequenceNumber - expectedSequence
    return gap > this.SEQUENCE_GAP_THRESHOLD
  }

  /**
   * Update player's hand after playing a card
   */
  private updatePlayerHand(
    viewModel: GameViewModel,
    playerId: string,
    cardId: string
  ): GameViewModel {
    const updatedPlayers = viewModel.players.map((p) => {
      if (p.id === playerId) {
        const newHandCardIds = p.handCardIds.filter((id) => id !== cardId)
        return updatePlayerViewModel(p, { handCardIds: newHandCardIds })
      }
      return p
    })

    return viewModel.withPlayers(updatedPlayers)
  }

  /**
   * Process a match result (capture cards, update field)
   */
  private processMatch(
    viewModel: GameViewModel,
    playerId: string,
    match: import('@/shared/events/base/MatchResult').MatchResult
  ): GameViewModel {
    let updatedViewModel = viewModel

    // Update field cards
    if (match.matchType === 'no_match') {
      // Add source card to field
      const newFieldCardIds = [...viewModel.fieldCardIds, match.sourceCardId]
      updatedViewModel = updatedViewModel.withFieldCards(newFieldCardIds)
    } else if (match.matchType === 'single_match') {
      // Remove matched field card and source card doesn't go to field
      const newFieldCardIds = viewModel.fieldCardIds.filter(
        (id) => id !== match.matchedFieldCardId
      )
      updatedViewModel = updatedViewModel.withFieldCards(newFieldCardIds)

      // Add captured cards to player
      updatedViewModel = this.updatePlayerCaptured(
        updatedViewModel,
        playerId,
        match.capturedCardIds
      )
    } else if (match.matchType === 'multiple_matches' && match.selectedFieldCardId) {
      // Remove selected field card
      const newFieldCardIds = viewModel.fieldCardIds.filter(
        (id) => id !== match.selectedFieldCardId
      )
      updatedViewModel = updatedViewModel.withFieldCards(newFieldCardIds)

      // Add captured cards to player
      updatedViewModel = this.updatePlayerCaptured(
        updatedViewModel,
        playerId,
        match.capturedCardIds
      )
    }

    return updatedViewModel
  }

  /**
   * Update player's captured cards
   */
  private updatePlayerCaptured(
    viewModel: GameViewModel,
    playerId: string,
    capturedCardIds: readonly string[]
  ): GameViewModel {
    const updatedPlayers = viewModel.players.map((p) => {
      if (p.id === playerId) {
        const newCapturedCardIds = [...p.capturedCardIds, ...capturedCardIds]
        return updatePlayerViewModel(p, { capturedCardIds: newCapturedCardIds })
      }
      return p
    })

    return viewModel.withPlayers(updatedPlayers)
  }

  /**
   * Calculate total score from yaku results
   */
  private calculateYakuScore(yakuResults: readonly import('@/shared/events/base/YakuResult').YakuResult[]): number {
    return yakuResults.reduce((total, yaku) => total + yaku.points, 0)
  }

  /**
   * Reset view model (for new game)
   */
  reset(): void {
    this.gameViewModel = null
    this.presenter.clearAll()
  }
}
