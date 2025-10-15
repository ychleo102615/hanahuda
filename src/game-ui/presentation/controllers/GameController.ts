import type { HandleUserInputUseCase, UserInputCommand } from '../../application/usecases/HandleUserInputUseCase'
import type { UpdateGameViewUseCase } from '../../application/usecases/UpdateGameViewUseCase'
import type { GameViewModel } from '../../domain/models/GameViewModel'

/**
 * Game Controller (Game UI BC - Presentation Layer)
 *
 * Coordinates user interactions with the game-ui BC.
 * Acts as the entry point for user actions from UI components.
 *
 * Responsibilities:
 * - Receive user actions from UI components
 * - Delegate to HandleUserInputUseCase for validation
 * - Send commands to game-engine BC (via event bus or direct calls)
 * - Provide read access to current game state
 *
 * Design:
 * - Presentation layer controller
 * - Thin coordinator between UI and application layer
 * - No business logic (delegates to use cases)
 * - Type-safe command handling
 */
export class GameController {
  constructor(
    private readonly handleUserInputUseCase: HandleUserInputUseCase,
    private readonly updateGameViewUseCase: UpdateGameViewUseCase,
    private readonly sendCommandToEngine: (command: any) => Promise<void>
  ) {}

  /**
   * Get current game view model (for UI rendering)
   */
  getGameState(): GameViewModel | null {
    return this.updateGameViewUseCase.getGameViewModel()
  }

  /**
   * Start a new game
   * This command goes directly to game-engine BC
   */
  async startNewGame(player1Name: string, player2Name: string): Promise<void> {
    try {
      // Send command directly to game-engine
      await this.sendCommandToEngine({
        type: 'START_GAME',
        player1Name,
        player2Name,
      })
    } catch (error) {
      console.error('Error starting new game:', error)
      throw error
    }
  }

  /**
   * Play a card from hand
   */
  async playCard(playerId: string, cardId: string): Promise<void> {
    const gameState = this.getGameState()
    if (!gameState) {
      throw new Error('No active game')
    }

    try {
      const command: UserInputCommand = {
        type: 'SELECT_CARD_FOR_PLAY',
        playerId,
        cardId,
      }

      const result = await this.handleUserInputUseCase.handleInput(command, gameState)

      if (result.success && result.requiresEngineAction) {
        await this.sendCommandToEngine(result.engineCommand)
      }
    } catch (error) {
      console.error('Error playing card:', error)
      throw error
    }
  }

  /**
   * Select a field card for matching (when multiple matches available)
   */
  async selectMatch(
    playerId: string,
    sourceCardId: string,
    selectedFieldCardId: string
  ): Promise<void> {
    const gameState = this.getGameState()
    if (!gameState) {
      throw new Error('No active game')
    }

    try {
      const command: UserInputCommand = {
        type: 'SELECT_MATCH',
        playerId,
        sourceCardId,
        selectedFieldCardId,
      }

      const result = await this.handleUserInputUseCase.handleInput(command, gameState)

      if (result.success && result.requiresEngineAction) {
        await this.sendCommandToEngine(result.engineCommand)
      }
    } catch (error) {
      console.error('Error selecting match:', error)
      throw error
    }
  }

  /**
   * Declare Koi-Koi decision
   */
  async declareKoikoi(playerId: string, continueGame: boolean): Promise<void> {
    const gameState = this.getGameState()
    if (!gameState) {
      throw new Error('No active game')
    }

    try {
      const command: UserInputCommand = {
        type: 'DECLARE_KOIKOI',
        playerId,
        continueGame,
      }

      const result = await this.handleUserInputUseCase.handleInput(command, gameState)

      if (result.success && result.requiresEngineAction) {
        await this.sendCommandToEngine(result.engineCommand)
      }
    } catch (error) {
      console.error('Error declaring Koi-Koi:', error)
      throw error
    }
  }

  /**
   * Start next round
   */
  async startNextRound(): Promise<void> {
    const gameState = this.getGameState()
    if (!gameState) {
      throw new Error('No active game')
    }

    try {
      const command: UserInputCommand = {
        type: 'START_NEXT_ROUND',
        gameId: gameState.gameId,
      }

      const result = await this.handleUserInputUseCase.handleInput(command, gameState)

      if (result.success && result.requiresEngineAction) {
        await this.sendCommandToEngine(result.engineCommand)
      }
    } catch (error) {
      console.error('Error starting next round:', error)
      throw error
    }
  }

  /**
   * Abandon current game
   */
  async abandonGame(playerId: string): Promise<void> {
    const gameState = this.getGameState()
    if (!gameState) {
      throw new Error('No active game')
    }

    try {
      const command: UserInputCommand = {
        type: 'ABANDON_GAME',
        gameId: gameState.gameId,
        playerId,
      }

      const result = await this.handleUserInputUseCase.handleInput(command, gameState)

      if (result.success && result.requiresEngineAction) {
        await this.sendCommandToEngine(result.engineCommand)
      }
    } catch (error) {
      console.error('Error abandoning game:', error)
      throw error
    }
  }

  /**
   * Check if a card can be played (for UI highlighting)
   */
  canPlayCard(playerId: string, cardId: string): boolean {
    const gameState = this.getGameState()
    if (!gameState) {
      return false
    }

    return this.handleUserInputUseCase.canPlayCard(gameState, playerId, cardId)
  }

  /**
   * Get possible matches for a card (for UI highlighting)
   */
  getPossibleMatches(cardId: string): string[] {
    const gameState = this.getGameState()
    if (!gameState) {
      return []
    }

    return this.handleUserInputUseCase.getPossibleMatches(gameState, cardId)
  }

  /**
   * Check if Koi-Koi decision is available
   */
  canDeclareKoikoi(playerId: string): boolean {
    const gameState = this.getGameState()
    if (!gameState) {
      return false
    }

    return this.handleUserInputUseCase.canDeclareKoikoi(gameState, playerId)
  }

  /**
   * Get current player ID
   */
  getCurrentPlayerId(): string | null {
    const gameState = this.getGameState()
    return gameState?.currentPlayerId || null
  }

  /**
   * Get game ID
   */
  getGameId(): string | null {
    const gameState = this.getGameState()
    return gameState?.gameId || null
  }

  /**
   * Check if game is active
   */
  isGameActive(): boolean {
    const gameState = this.getGameState()
    return gameState !== null && !gameState.isGameOver
  }
}

/**
 * Factory function to create GameController
 */
export function createGameController(
  handleUserInputUseCase: HandleUserInputUseCase,
  updateGameViewUseCase: UpdateGameViewUseCase,
  sendCommandToEngine: (command: any) => Promise<void>
): GameController {
  return new GameController(handleUserInputUseCase, updateGameViewUseCase, sendCommandToEngine)
}
