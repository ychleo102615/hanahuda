import { Player } from '../../domain/entities/Player'
import type { GameState } from '../../domain/entities/GameState'
import { GameState as GameStateClass } from '../../domain/entities/GameState'
import { DeckService } from '../../domain/services/DeckService'
import type { IEventPublisher } from '../ports/IEventPublisher'
import type { GameRepository } from '@/application/ports/repositories/GameRepository'
import type { StartGameInputDTO, SetUpGameResult, GameStateOutputDTO } from '@/application/dto/GameDTO'
import type { GameInitializedEvent } from '@/shared/events/game/GameInitializedEvent'
import type { TurnTransition } from '@/shared/events/base/TurnTransition'
import { HANAFUDA_CARDS } from '@/shared/constants/gameConstants'
import { v4 as uuidv4 } from 'uuid'

/**
 * Set Up Game Use Case (Game Engine BC)
 *
 * Refactored from the original application layer to game-engine BC.
 * Now publishes GameInitializedEvent as an integration event.
 *
 * Responsibilities:
 * - Create new game instance
 * - Initialize players
 * - Create and shuffle deck (but not deal cards - that's SetUpRoundUseCase)
 * - Set initial game phase to 'setup'
 * - Publish GameInitializedEvent for game-ui BC
 */
export class SetUpGameUseCase {
  private deckService: DeckService

  constructor(
    private gameRepository: GameRepository,
    private eventPublisher: IEventPublisher
  ) {
    this.deckService = new DeckService()
  }

  /**
   * Creates new game (without dealing cards)
   * @param input - Game setup input with player names
   * @returns Setup result with game ID and initial state
   */
  async execute(input: StartGameInputDTO): Promise<SetUpGameResult> {
    try {
      const newGameId = await this.createGame()

      const player1 = new Player('player1', input.player1Name, true)
      const player2 = new Player('player2', input.player2Name, false)

      const gameState = await this.setupGame(newGameId, player1, player2)

      // Publish GameInitializedEvent for game-ui BC
      await this.publishGameInitializedEvent(newGameId, gameState)

      const gameStateDTO = this.mapGameStateToDTO(newGameId, gameState)

      return {
        success: true,
        gameId: newGameId,
        gameState: gameStateDTO
      }
    } catch (error) {
      return {
        success: false,
        gameId: '',
        error: `Error starting game: ${error}`
      }
    }
  }

  async createGame(): Promise<string> {
    return await this.gameRepository.createGame()
  }

  private async setupGame(gameId: string, player1: Player, player2: Player): Promise<GameState> {
    const gameState = new GameStateClass()

    gameState.addPlayer(player1)
    gameState.addPlayer(player2)

    // Create shuffled deck but don't deal cards (SetUpRoundUseCase handles dealing)
    const deck = this.deckService.createShuffledDeck()
    gameState.setDeck(deck)

    gameState.setPhase('setup')

    // Save the game state with players to repository
    await this.gameRepository.saveGame(gameId, gameState)

    return gameState
  }

  /**
   * Publishes GameInitializedEvent to notify game-ui BC
   * This is the complete game state snapshot event
   */
  private async publishGameInitializedEvent(gameId: string, gameState: GameState): Promise<void> {
    const turnTransition: TurnTransition = {
      previousPlayerId: null, // No previous player at game start
      currentPlayerId: gameState.currentPlayer?.id || 'player1',
      reason: 'game_initialized'
    }

    const event: GameInitializedEvent = {
      eventId: uuidv4(),
      eventType: 'GameInitialized',
      timestamp: Date.now(),
      sequenceNumber: await this.eventPublisher.getNextSequenceNumber(),
      gameState: {
        gameId: gameId,
        currentRound: gameState.round,
        phase: gameState.phase,
        currentPlayerId: gameState.currentPlayer?.id || 'player1',
        players: gameState.players.map(player => ({
          id: player.id,
          name: player.name,
          handCardIds: player.hand.map(card => card.id),
          capturedCardIds: player.captured.map(card => card.id),
          totalScore: player.score,
          roundScore: player.roundScore
        })),
        fieldCardIds: gameState.field.map(card => card.id),
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

  private mapGameStateToDTO(gameId: string, gameState: GameState): GameStateOutputDTO {
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
