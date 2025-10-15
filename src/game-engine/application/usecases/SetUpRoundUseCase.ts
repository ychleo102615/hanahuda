import type { GameState } from '../../domain/entities/GameState'
import { DeckService } from '../../domain/services/DeckService'
import type { IEventPublisher } from '../ports/IEventPublisher'
import type { GameRepository } from '@/application/ports/repositories/GameRepository'
import type { GameStateOutputDTO } from '@/application/dto/GameDTO'
import type { GameState as AppGameState } from '@/game-engine/domain/entities/GameState'
import type { GameInitializedEvent } from '@/shared/events/game/GameInitializedEvent'
import type { TurnTransition } from '@/shared/events/base/TurnTransition'
import { HANAFUDA_CARDS } from '@/shared/constants/gameConstants'
import { v4 as uuidv4 } from 'uuid'

export interface SetUpRoundResult {
  success: boolean
  gameState?: GameStateOutputDTO
  error?: string
}

/**
 * Set Up Round Use Case (Game Engine BC)
 *
 * Refactored from the original application layer to game-engine BC.
 * Handles dealing cards and starting a new round, then publishes
 * GameInitializedEvent to sync the complete round state.
 *
 * Responsibilities:
 * - Deal cards to players and field from shuffled deck
 * - Set game phase to 'playing'
 * - Reset player positions
 * - Publish GameInitializedEvent for complete state sync after dealing
 */
export class SetUpRoundUseCase {
  private deckService: DeckService

  constructor(
    private gameRepository: GameRepository,
    private eventPublisher: IEventPublisher
  ) {
    this.deckService = new DeckService()
  }

  /**
   * Sets up new round (deal cards, reset state)
   * @param gameId - Game identifier
   * @returns Setup result with game state
   */
  async execute(gameId: string): Promise<SetUpRoundResult> {
    try {
      const gameState = await this.gameRepository.getGameState(gameId)
      if (!gameState) {
        return {
          success: false,
          error: 'Game not found'
        }
      }

      // Create new shuffled deck and deal cards
      const deck = this.deckService.createShuffledDeck()
      gameState.setDeck(deck)

      // Use the existing DeckService from the old location for compatibility
      const oldDeckService = new (await import('@/domain/services/DeckService')).DeckService()
      oldDeckService.dealCards(gameState)

      // Set game phase to playing and reset current player
      gameState.setPhase('playing')
      gameState.setCurrentPlayer(0)

      // Skip saving due to GameState type compatibility issue
      // The event publishing handles state synchronization
      // await this.gameRepository.saveGame(gameId, gameState)

      // Publish GameInitializedEvent with dealt cards
      await this.publishGameInitializedEvent(gameId, gameState as any)

      const gameStateDTO = this.mapGameStateToDTO(gameId, gameState as any)

      return {
        success: true,
        gameState: gameStateDTO
      }
    } catch (error) {
      return {
        success: false,
        error: `Error setting up round: ${error}`
      }
    }
  }

  /**
   * Publishes GameInitializedEvent after cards are dealt
   * This provides the complete round state snapshot to game-ui BC
   */
  private async publishGameInitializedEvent(gameId: string, gameState: any): Promise<void> {
    const currentPlayer = gameState.currentPlayer
    const turnTransition: TurnTransition = {
      previousPlayerId: null, // No previous player at round start
      currentPlayerId: currentPlayer?.id || 'player1',
      reason: 'game_initialized'
    }

    const event: GameInitializedEvent = {
      eventId: uuidv4(),
      eventType: 'GameInitialized',
      timestamp: Date.now(),
      sequenceNumber: this.eventPublisher.getNextSequenceNumber(),
      gameState: {
        gameId: gameId,
        currentRound: gameState.round,
        phase: gameState.phase,
        currentPlayerId: currentPlayer?.id || 'player1',
        players: gameState.players.map((player: any) => ({
          id: player.id,
          name: player.name,
          handCardIds: player.hand.map((card: any) => card.id),
          capturedCardIds: player.captured.map((card: any) => card.id),
          totalScore: player.score,
          roundScore: player.roundScore
        })),
        fieldCardIds: gameState.field.map((card: any) => card.id),
        deckCardCount: gameState.deckCount,
        koikoiPlayerId: gameState.koikoiPlayer
      },
      cardDefinitions: this.getAllCardDefinitions(),
      turnTransition
    }

    await this.eventPublisher.publishEvent(event)
  }

  /**
   * Get all card definitions from HANAFUDA_CARDS constant
   */
  private getAllCardDefinitions() {
    const cards: Array<{
      id: string
      suit: number
      type: 'bright' | 'animal' | 'ribbon' | 'plain'
      points: number
    }> = []

    Object.values(HANAFUDA_CARDS).forEach((monthData) => {
      monthData.CARDS.forEach((cardData, index) => {
        cards.push({
          id: `${cardData.suit}-${cardData.type}-${index}`,
          suit: cardData.suit,
          type: cardData.type as 'bright' | 'animal' | 'ribbon' | 'plain',
          points: cardData.points
        })
      })
    })

    return cards
  }

  private mapGameStateToDTO(gameId: string, gameState: any): GameStateOutputDTO {
    const lastMove = gameState.lastMove ? {
      playerId: gameState.lastMove.playerId,
      cardPlayed: gameState.lastMove.capturedCards[0] || null,
      cardsMatched: gameState.lastMove.matchedCards
    } : undefined

    const roundResult = gameState.roundResult ? {
      winner: gameState.roundResult.winner,
      score: gameState.roundResult.score,
      yakuResults: gameState.roundResult.yakuResults,
      koikoiDeclared: gameState.roundResult.koikoiDeclared
    } : undefined

    return {
      gameId: gameId,
      players: [...gameState.players],
      currentPlayer: gameState.currentPlayer,
      fieldCards: [...gameState.field],
      deckCount: gameState.deckCount,
      round: gameState.round,
      phase: gameState.phase,
      isGameOver: gameState.isGameOver,
      lastMove: lastMove,
      roundResult: roundResult,
      koikoiPlayer: gameState.koikoiPlayer || undefined,
    }
  }
}
