import type { GameState } from '../../domain/entities/GameState'
import type { GameRepository } from '../ports/repositories/GameRepository'
import type { GameStateOutputDTO } from '../dto/GameDTO'
import { DeckService } from '../../domain/services/DeckService'

export interface SetUpRoundResult {
  success: boolean
  gameState?: GameStateOutputDTO
  error?: string
}

export class SetUpRoundUseCase {
  private deckService: DeckService

  constructor(
    private gameRepository: GameRepository,
  ) {
    this.deckService = new DeckService()
  }

  /**
   * 設置新回合（發牌、重置狀態）
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

      // 創建新牌組並發牌
      const deck = this.deckService.createShuffledDeck()
      gameState.setDeck(deck)
      this.deckService.dealCards(gameState)

      gameState.setPhase('playing')
      gameState.setCurrentPlayer(0)

      await this.gameRepository.saveGame(gameId, gameState)

      const gameStateDTO = this.mapGameStateToDTO(gameId, gameState)

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