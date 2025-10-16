import type { IUIPresenter } from '../ports/IUIPresenter'
import { UICardMatchingService } from '../../domain/services/UICardMatchingService'
import type { GameViewModel } from '../../domain/models/GameViewModel'

/**
 * User Input Command Types
 */
export type UserInputCommand =
  | { type: 'SELECT_CARD_FOR_PLAY'; playerId: string; cardId: string }
  | { type: 'SELECT_MATCH'; playerId: string; sourceCardId: string; selectedFieldCardId: string }
  | { type: 'DECLARE_KOIKOI'; playerId: string; continueGame: boolean }
  | { type: 'START_NEXT_ROUND'; gameId: string }
  | { type: 'ABANDON_GAME'; gameId: string; playerId: string }

/**
 * User Input Result
 */
export interface UserInputResult {
  success: boolean
  error?: string
  requiresEngineAction?: boolean
  engineCommand?: any
}

/**
 * Handle User Input Use Case (Game UI BC)
 *
 * Responsible for:
 * - Validating user input against current game state
 * - Providing UI feedback for invalid actions
 * - Preparing commands to send to game-engine BC
 * - Managing local UI state during user interactions
 *
 * Design:
 * - Pure validation logic (no side effects)
 * - Returns commands for game-engine rather than executing them directly
 * - Presenter integration for immediate UI feedback
 */
export class HandleUserInputUseCase {
  private cardMatchingService: UICardMatchingService | null = null

  constructor(private readonly presenter: IUIPresenter) {}

  /**
   * Initialize with game view model
   * Must be called after game is initialized
   */
  initialize(gameViewModel: GameViewModel): void {
    this.cardMatchingService = new UICardMatchingService(gameViewModel.cardDefinitions)
  }

  /**
   * Handle user input command
   */
  async handleInput(
    command: UserInputCommand,
    gameViewModel: GameViewModel
  ): Promise<UserInputResult> {
    // Ensure card matching service is initialized
    if (!this.cardMatchingService) {
      this.cardMatchingService = new UICardMatchingService(gameViewModel.cardDefinitions)
    }

    switch (command.type) {
      case 'SELECT_CARD_FOR_PLAY':
        return this.handleCardSelection(command, gameViewModel)

      case 'SELECT_MATCH':
        return this.handleMatchSelection(command, gameViewModel)

      case 'DECLARE_KOIKOI':
        return this.handleKoikoiDeclaration(command, gameViewModel)

      case 'START_NEXT_ROUND':
        return this.handleStartNextRound(command, gameViewModel)

      case 'ABANDON_GAME':
        return this.handleAbandonGame(command, gameViewModel)

      default:
        return {
          success: false,
          error: 'Unknown command type',
        }
    }
  }

  /**
   * Handle card selection for play
   */
  private handleCardSelection(
    command: Extract<UserInputCommand, { type: 'SELECT_CARD_FOR_PLAY' }>,
    gameViewModel: GameViewModel
  ): UserInputResult {
    const { playerId, cardId } = command

    // Validate it's player's turn
    if (gameViewModel.currentPlayerId !== playerId) {
      this.presenter.presentError('errors.notYourTurn')
      return {
        success: false,
        error: 'Not your turn',
      }
    }

    // Validate game is in playing phase
    if (gameViewModel.phase !== 'playing') {
      this.presenter.presentError('errors.cannotPlayCard', {
        phase: gameViewModel.phase,
      })
      return {
        success: false,
        error: `Cannot play card in ${gameViewModel.phase} phase`,
      }
    }

    // Validate player has the card
    const player = gameViewModel.getPlayer(playerId)
    if (!player) {
      this.presenter.presentError('errors.playerNotFound')
      return {
        success: false,
        error: 'Player not found',
      }
    }

    if (!player.handCardIds.includes(cardId)) {
      this.presenter.presentError('errors.cardNotInHand')
      return {
        success: false,
        error: 'Card not in hand',
      }
    }

    // Find potential matches (for UI feedback)
    const matches = this.cardMatchingService!.findMatches(cardId, gameViewModel.fieldCardIds)

    // Provide UI feedback
    if (matches.length === 0) {
      this.presenter.presentMessage('game.messages.noMatchCardToField')
    } else if (matches.length === 1) {
      this.presenter.presentMessage('game.messages.singleMatchFound')
    } else {
      this.presenter.presentMessage('game.messages.multipleMatchesFound', {
        count: matches.length,
      })
    }

    // Return command for game-engine
    return {
      success: true,
      requiresEngineAction: true,
      engineCommand: {
        type: 'PLAY_CARD',
        gameId: gameViewModel.gameId,
        playerId,
        cardId,
      },
    }
  }

  /**
   * Handle match selection (for multiple matches)
   */
  private handleMatchSelection(
    command: Extract<UserInputCommand, { type: 'SELECT_MATCH' }>,
    gameViewModel: GameViewModel
  ): UserInputResult {
    const { playerId, sourceCardId, selectedFieldCardId } = command

    // Validate there's a pending selection
    if (!gameViewModel.hasSelectionPending) {
      this.presenter.presentError('errors.noSelectionPending')
      return {
        success: false,
        error: 'No selection pending',
      }
    }

    const pendingSelection = gameViewModel.pendingMatchSelection!

    // Validate it's the correct player
    if (pendingSelection.playerId !== playerId) {
      this.presenter.presentError('errors.notYourTurn')
      return {
        success: false,
        error: 'Not your turn',
      }
    }

    // Validate source card matches
    if (pendingSelection.sourceCardId !== sourceCardId) {
      this.presenter.presentError('errors.invalidSelection')
      return {
        success: false,
        error: 'Source card mismatch',
      }
    }

    // Validate selected field card is in selectable list
    if (!pendingSelection.selectableFieldCardIds.includes(selectedFieldCardId)) {
      this.presenter.presentError('errors.invalidFieldCardSelection')
      return {
        success: false,
        error: 'Selected field card not in selectable list',
      }
    }

    // Validate cards can match
    if (!this.cardMatchingService!.canMatch(sourceCardId, selectedFieldCardId)) {
      this.presenter.presentError('errors.cardsCannotMatch')
      return {
        success: false,
        error: 'Cards cannot match',
      }
    }

    // Clear selection UI
    this.presenter.clearMatchSelection()
    this.presenter.presentMessage('game.messages.matchSelected')

    // Return command for game-engine
    return {
      success: true,
      requiresEngineAction: true,
      engineCommand: {
        type: 'SELECT_MATCH',
        gameId: gameViewModel.gameId,
        playerId,
        sourceCardId,
        selectedFieldCardId,
      },
    }
  }

  /**
   * Handle Koi-Koi declaration
   */
  private handleKoikoiDeclaration(
    command: Extract<UserInputCommand, { type: 'DECLARE_KOIKOI' }>,
    gameViewModel: GameViewModel
  ): UserInputResult {
    const { playerId, continueGame } = command

    // Validate game is in Koi-Koi phase
    if (gameViewModel.phase !== 'koikoi') {
      this.presenter.presentError('errors.notInKoikoiPhase')
      return {
        success: false,
        error: 'Not in Koi-Koi phase',
      }
    }

    // Validate it's player's turn
    if (gameViewModel.currentPlayerId !== playerId) {
      this.presenter.presentError('errors.notYourTurn')
      return {
        success: false,
        error: 'Not your turn',
      }
    }

    // Clear Koi-Koi dialog
    this.presenter.clearKoikoiDialog()

    if (continueGame) {
      this.presenter.presentMessage('game.messages.koikoiDeclared')
    } else {
      this.presenter.presentMessage('game.messages.roundEnding')
    }

    // Return command for game-engine
    return {
      success: true,
      requiresEngineAction: true,
      engineCommand: {
        type: 'DECLARE_KOIKOI',
        gameId: gameViewModel.gameId,
        playerId,
        continueGame,
      },
    }
  }

  /**
   * Handle start next round
   */
  private handleStartNextRound(
    command: Extract<UserInputCommand, { type: 'START_NEXT_ROUND' }>,
    gameViewModel: GameViewModel
  ): UserInputResult {
    const { gameId } = command

    // Validate game is in round_end phase
    if (gameViewModel.phase !== 'round_end') {
      this.presenter.presentError('errors.roundNotEnded')
      return {
        success: false,
        error: 'Round not ended',
      }
    }

    this.presenter.presentLoading(true, 'game.messages.startingNextRound')

    // Return command for game-engine
    return {
      success: true,
      requiresEngineAction: true,
      engineCommand: {
        type: 'START_NEXT_ROUND',
        gameId,
      },
    }
  }

  /**
   * Handle abandon game
   */
  private async handleAbandonGame(
    command: Extract<UserInputCommand, { type: 'ABANDON_GAME' }>,
    gameViewModel: GameViewModel
  ): Promise<UserInputResult> {
    const { gameId, playerId } = command

    // Validate game is not already over
    if (gameViewModel.isGameOver) {
      this.presenter.presentError('errors.gameAlreadyOver')
      return {
        success: false,
        error: 'Game already over',
      }
    }

    // Show confirmation dialog and wait for user response
    const confirmed = await this.presenter.presentAbandonConfirmation(playerId)

    if (!confirmed) {
      // User cancelled the abandon action
      return {
        success: false,
        error: 'Abandon cancelled by user',
      }
    }

    // User confirmed, show abandonment message
    this.presenter.presentMessage('game.messages.gameAbandoned', {
      playerName: gameViewModel.getPlayer(playerId)?.name || '',
    })

    // Return command for game-engine
    return {
      success: true,
      requiresEngineAction: true,
      engineCommand: {
        type: 'ABANDON_GAME',
        gameId,
        playerId,
      },
    }
  }

  /**
   * Validate if a card can be played (for UI highlighting)
   * This is a read-only check for UI feedback
   */
  canPlayCard(gameViewModel: GameViewModel, playerId: string, cardId: string): boolean {
    if (gameViewModel.currentPlayerId !== playerId) {
      return false
    }

    if (gameViewModel.phase !== 'playing') {
      return false
    }

    const player = gameViewModel.getPlayer(playerId)
    if (!player) {
      return false
    }

    return player.handCardIds.includes(cardId)
  }

  /**
   * Get possible matches for a card (for UI highlighting)
   */
  getPossibleMatches(gameViewModel: GameViewModel, cardId: string): string[] {
    if (!this.cardMatchingService) {
      return []
    }

    return this.cardMatchingService.findMatches(cardId, gameViewModel.fieldCardIds)
  }

  /**
   * Check if Koi-Koi decision is available
   */
  canDeclareKoikoi(gameViewModel: GameViewModel, playerId: string): boolean {
    return (
      gameViewModel.phase === 'koikoi' &&
      gameViewModel.currentPlayerId === playerId &&
      gameViewModel.recentYakuResults.length > 0
    )
  }
}
