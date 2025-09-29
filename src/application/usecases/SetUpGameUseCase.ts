import { Player } from '../../domain/entities/Player'
import type { GameState } from '../../domain/entities/GameState'
import { GameState as GameStateClass } from '../../domain/entities/GameState'
import type { GameRepository } from '../ports/repositories/GameRepository'
import type { StartGameInputDTO, SetUpGameResult, GameStateOutputDTO } from '../dto/GameDTO'
import { DeckService } from '../../domain/services/DeckService'

export class SetUpGameUseCase {
  private deckService: DeckService

  constructor(
    private gameRepository: GameRepository,
  ) {
    this.deckService = new DeckService()
  }

  /**
   * 創建新遊戲（不包含發牌邏輯）
   */
  async execute(input: StartGameInputDTO): Promise<SetUpGameResult> {
    try {
      const newGameId = await this.createGame()

      const player1 = new Player('player1', input.player1Name, true)
      const player2 = new Player('player2', input.player2Name, false)

      const gameState = await this.setupGame(newGameId, player1, player2)
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

    // 創建牌組但不發牌（發牌由 SetUpRoundUseCase 處理）
    const deck = this.deckService.createShuffledDeck()
    gameState.setDeck(deck)

    gameState.setPhase('setup')
    await this.gameRepository.saveGame(gameId, gameState)

    return gameState
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