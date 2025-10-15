import type { IUIPresenter } from '../../application/ports/IUIPresenter'
import type { GameViewModel } from '../../domain/models/GameViewModel'
import type { YakuResult } from '@/shared/events/base/YakuResult'
import type { MatchResult } from '@/shared/events/base/MatchResult'
import type { useGameStore } from '../stores/gameStore'
import type { LocaleService } from '@/infrastructure/services/LocaleService'

/**
 * Vue Game Presenter (Game UI BC - Presentation Layer)
 *
 * Implements IUIPresenter to present game state and updates to Vue components.
 * Bridges the application layer with the Vue store (Pinia).
 *
 * Responsibilities:
 * - Translate application layer updates to store mutations
 * - Format messages using LocaleService
 * - Manage UI state (dialogs, loading, errors)
 * - Trigger animations and visual feedback
 *
 * Design:
 * - Presentation layer adapter
 * - Implements application port (IUIPresenter)
 * - Framework-specific (Vue/Pinia)
 * - Thin translation layer (no business logic)
 */
export class VueGamePresenter implements IUIPresenter {
  constructor(
    private readonly gameStore: ReturnType<typeof useGameStore>,
    private readonly localeService: LocaleService
  ) {}

  // ==================== State Presentation ====================

  presentGameState(gameViewModel: GameViewModel): void {
    this.gameStore.setGameViewModel(gameViewModel)
    this.gameStore.setGameStarted(true)
    this.gameStore.clearError()
  }

  presentStateUpdate(updates: Partial<GameViewModel>): void {
    // For incremental updates, we update the entire view model
    // since GameViewModel is immutable
    const currentViewModel = this.gameStore.gameViewModel
    if (currentViewModel) {
      this.gameStore.setGameViewModel(currentViewModel.clone(updates as any))
    }
  }

  // ==================== User Feedback ====================

  presentCardPlayAnimation(playerId: string, cardId: string, handMatch: MatchResult): void {
    // Trigger card play animation
    this.gameStore.triggerAnimation({
      type: 'card_play',
      playerId,
      cardId,
      matchType: handMatch.matchType,
      capturedCardIds: handMatch.capturedCardIds as string[],
    })

    // Clear selections
    this.gameStore.clearSelections()
  }

  presentDeckRevealAnimation(cardId: string, deckMatch: MatchResult): void {
    // Trigger deck reveal animation
    this.gameStore.triggerAnimation({
      type: 'deck_reveal',
      cardId,
      matchType: deckMatch.matchType,
      capturedCardIds: deckMatch.capturedCardIds as string[],
    })
  }

  presentYakuAchievement(playerId: string, yakuResults: readonly YakuResult[]): void {
    this.gameStore.setYakuDisplay(yakuResults as YakuResult[])

    // Show yaku achievement message
    const totalScore = yakuResults.reduce((sum, yaku) => sum + yaku.points, 0)
    this.presentMessage('game.messages.yakuAchieved', {
      count: yakuResults.length,
      score: totalScore,
    })
  }

  presentMatchSelection(
    sourceCardId: string,
    selectableCardIds: readonly string[],
    timeoutMs: number
  ): void {
    this.gameStore.showMatchSelection({
      sourceCardId,
      selectableCardIds: selectableCardIds as string[],
      timeoutMs,
      startedAt: Date.now(),
    })
  }

  clearMatchSelection(): void {
    this.gameStore.hideMatchSelection()
  }

  presentMessage(messageKey: string, params?: Record<string, any>): void {
    const translatedMessage = this.localeService.translate(messageKey, params)
    this.gameStore.setGameMessage(translatedMessage)
    this.gameStore.clearError()
  }

  presentError(errorKey: string, params?: Record<string, any>): void {
    const translatedError = this.localeService.translate(errorKey, params)
    this.gameStore.setError(translatedError)
  }

  // ==================== Dialogs ====================

  presentKoikoiDialog(
    playerId: string,
    currentYaku: readonly YakuResult[],
    currentScore: number
  ): void {
    this.gameStore.showKoikoiDialog({
      playerId,
      yakuResults: currentYaku as YakuResult[],
      currentScore,
    })
  }

  clearKoikoiDialog(): void {
    this.gameStore.hideKoikoiDialog()
    this.gameStore.setYakuDisplay([])
  }

  presentRoundEnd(
    winnerId: string | null,
    winnerName: string | null,
    score: number,
    yakuResults: readonly YakuResult[]
  ): void {
    if (winnerId && winnerName) {
      this.presentMessage('game.messages.roundWon', {
        winner: winnerName,
        score,
      })
    } else {
      this.presentMessage('game.messages.roundDraw')
    }

    if (yakuResults.length > 0) {
      this.gameStore.setYakuDisplay(yakuResults as YakuResult[])
    }
  }

  presentGameEnd(
    winnerId: string | null,
    winnerName: string | null,
    finalScore: number,
    totalRounds: number
  ): void {
    if (winnerId && winnerName) {
      this.presentMessage('game.messages.gameWon', {
        winner: winnerName,
        finalScore,
        rounds: totalRounds,
      })
    } else {
      this.presentMessage('game.messages.gameDraw', {
        rounds: totalRounds,
      })
    }

    this.gameStore.setGameOver(true)
  }

  // ==================== Loading & Transitions ====================

  presentLoading(isLoading: boolean, message?: string): void {
    this.gameStore.setLoading(isLoading)
    if (message) {
      this.presentMessage(message)
    }
  }

  presentTurnTransition(fromPlayerId: string, toPlayerId: string, reason: string): void {
    this.gameStore.triggerAnimation({
      type: 'turn_transition',
      fromPlayerId,
      toPlayerId,
      reason,
    })

    // Show turn change message
    const currentViewModel = this.gameStore.gameViewModel
    if (currentViewModel) {
      const newPlayer = currentViewModel.getPlayer(toPlayerId)
      if (newPlayer) {
        this.presentMessage('game.messages.turnChanged', {
          playerName: newPlayer.name,
        })
      }
    }
  }

  // ==================== Cleanup ====================

  clearAll(): void {
    this.gameStore.resetGame()
  }
}

/**
 * Factory function to create VueGamePresenter
 */
export function createVueGamePresenter(
  gameStore: ReturnType<typeof useGameStore>,
  localeService: LocaleService
): VueGamePresenter {
  return new VueGamePresenter(gameStore, localeService)
}
