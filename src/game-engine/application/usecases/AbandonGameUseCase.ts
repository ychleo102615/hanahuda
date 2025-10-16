import type { IEventPublisher } from '../ports/IEventPublisher'
import type { GameRepository } from '@/application/ports/repositories/GameRepository'
import type { GameAbandonedEvent } from '@/shared/events/game/GameAbandonedEvent'
import { v4 as uuidv4 } from 'uuid'

/**
 * Abandon Game Use Case (Game Engine BC)
 *
 * Handles player abandoning the current game at any stage.
 * The game ends immediately and the opponent is declared winner.
 *
 * Responsibilities:
 * - Validate game exists and is in progress
 * - Record abandonment with current scores
 * - Mark game as ended
 * - Publish GameAbandonedEvent for game-ui BC
 */

interface AbandonGameInputDTO {
  /** Game unique identifier */
  readonly gameId: string
  /** Player who is abandoning the game */
  readonly abandoningPlayerId: string
  /** Optional reason for abandonment */
  readonly reason?: 'user_quit' | 'timeout' | 'connection_lost'
}

interface AbandonGameResult {
  readonly success: boolean
  readonly winnerId?: string
  readonly error?: string
}

export class AbandonGameUseCase {
  constructor(
    private gameRepository: GameRepository,
    private eventPublisher: IEventPublisher
  ) {}

  /**
   * Executes the abandon game operation
   * @param input - Abandonment input with game ID and player ID
   * @returns Result with success status and winner ID
   */
  async execute(input: AbandonGameInputDTO): Promise<AbandonGameResult> {
    try {
      // Validate game exists
      const gameState = await this.gameRepository.getGameState(input.gameId)
      if (!gameState) {
        return {
          success: false,
          error: 'Game not found'
        }
      }

      // Validate game is not already over
      if (gameState.isGameOver) {
        return {
          success: false,
          error: 'Game is already over'
        }
      }

      // Validate abandoning player exists
      const abandoningPlayer = (gameState as any).players.find((p: any) => p.id === input.abandoningPlayerId)
      if (!abandoningPlayer) {
        return {
          success: false,
          error: 'Player not found in game'
        }
      }

      // Determine winner (opponent of abandoning player)
      const winner = (gameState as any).players.find((p: any) => p.id !== input.abandoningPlayerId)
      if (!winner) {
        return {
          success: false,
          error: 'Opponent player not found'
        }
      }

      // Mark game as over by setting phase to 'game_end'
      gameState.setPhase('game_end')

      // Save updated game state
      await this.gameRepository.saveGame(input.gameId, gameState)

      // Publish GameAbandonedEvent
      await this.publishGameAbandonedEvent(
        input.gameId,
        input.abandoningPlayerId,
        winner.id,
        (gameState as any).round,
        (gameState as any).phase,
        (gameState as any).players,
        input.reason || 'user_quit'
      )

      // Note: Game state cleanup (deleteGame) is handled by the coordinator
      // to ensure UI updates are completed first

      return {
        success: true,
        winnerId: winner.id
      }
    } catch (error) {
      return {
        success: false,
        error: `Error abandoning game: ${error}`
      }
    }
  }

  /**
   * Publishes GameAbandonedEvent to notify game-ui BC
   */
  private async publishGameAbandonedEvent(
    gameId: string,
    abandoningPlayerId: string,
    winnerId: string,
    roundNumber: number,
    gamePhase: 'setup' | 'dealing' | 'playing' | 'koikoi' | 'round_end',
    players: any[],
    reason: 'user_quit' | 'timeout' | 'connection_lost'
  ): Promise<void> {
    const event: GameAbandonedEvent = {
      eventId: uuidv4(),
      eventType: 'GameAbandoned',
      timestamp: Date.now(),
      sequenceNumber: await this.eventPublisher.getNextSequenceNumber(),
      gameId,
      abandoningPlayerId,
      winnerId,
      roundNumber,
      gamePhase,
      scoresAtAbandonment: players.map(player => ({
        playerId: player.id,
        totalScore: player.score,
        roundScore: player.roundScore
      })),
      abandonmentTime: Date.now(),
      reason
    }

    await this.eventPublisher.publishEvent(event)
  }
}
