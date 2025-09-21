import type { Card } from '@/domain/entities/Card'
import { Player } from '@/domain/entities/Player'
import type { GameFlowUseCase } from '@/application/usecases/GameFlowUseCase'
import type { PlayCardUseCase } from '@/application/usecases/PlayCardUseCase'
import type { CalculateScoreUseCase } from '@/application/usecases/CalculateScoreUseCase'
import type { GamePresenter } from '@/application/ports/presenters/GamePresenter'
import type { GameRepository } from '@/application/ports/repositories/GameRepository'
import type {
  StartGameInputDTO,
  PlayCardInputDTO,
  KoikoiDecisionInputDTO,
  GameStateOutputDTO,
} from '@/application/dto/GameDTO'

export class GameController {
  private gameId: string = ''

  constructor(
    private gameFlowUseCase: GameFlowUseCase,
    private playCardUseCase: PlayCardUseCase,
    private calculateScoreUseCase: CalculateScoreUseCase,
    private gameRepository: GameRepository,
    private gamePresenter: GamePresenter,
  ) {}

  async startNewGame(input: StartGameInputDTO): Promise<void> {
    try {
      this.gamePresenter.presentGameMessage('Starting new game...')

      const newGameId = await this.gameFlowUseCase.createGame()
      this.gameId = newGameId

      const player1 = new Player('player1', input.player1Name, true)
      const player2 = new Player('player2', input.player2Name, false)

      await this.gameFlowUseCase.setupGame(newGameId, player1, player2)
      const dealtGameState = await this.gameFlowUseCase.dealCards(newGameId)

      const gameStateDTO = this.mapGameStateToDTO(dealtGameState)

      this.gamePresenter.presentStartGameResult({
        gameId: newGameId,
        success: true,
      })

      this.gamePresenter.presentGameState(gameStateDTO)
      this.gamePresenter.presentGameMessage(
        `Game started! ${dealtGameState.currentPlayer?.name}'s turn`,
      )
    } catch (error) {
      const errorMessage = `Error starting game: ${error}`
      this.gamePresenter.presentStartGameResult({
        gameId: '',
        success: false,
        error: errorMessage,
      })
      this.gamePresenter.presentError(errorMessage)
    }
  }

  async playCard(input: PlayCardInputDTO): Promise<void> {
    if (!this.gameId) {
      this.gamePresenter.presentError('No active game')
      return
    }

    try {
      const result = await this.playCardUseCase.execute(this.gameId, input)

      this.gamePresenter.presentPlayCardResult(result)

      if (result.success) {
        const updatedGameState = await this.gameRepository.getGameState(this.gameId)
        if (updatedGameState) {
          const gameStateDTO = this.mapGameStateToDTO(updatedGameState)
          this.gamePresenter.presentGameState(gameStateDTO)
        }

        if (result.yakuResults.length > 0) {
          this.gamePresenter.presentYakuDisplay(result.yakuResults)
          if (result.nextPhase === 'koikoi') {
            this.gamePresenter.presentKoikoiDialog(true)
            this.gamePresenter.presentGameMessage('You achieved Yaku! Declare Koi-Koi?')
          }
        } else {
          this.gamePresenter.presentGameMessage(
            `Played ${result.playedCard?.name}. Captured ${result.capturedCards.length} cards.`,
          )
        }

        if (result.nextPhase === 'round_end') {
          await this.handleRoundEnd()
        }
      } else {
        this.gamePresenter.presentError(result.error || 'Failed to play card')
      }
    } catch (error) {
      this.gamePresenter.presentError(`Error playing card: ${error}`)
    }
  }

  async handleKoikoiDecision(input: KoikoiDecisionInputDTO): Promise<void> {
    if (!this.gameId) {
      this.gamePresenter.presentError('No active game')
      return
    }

    try {
      if (input.declareKoikoi) {
        await this.gameFlowUseCase.handleKoikoiDeclaration(this.gameId, input.playerId, true)
        this.gamePresenter.presentGameMessage('Koi-Koi declared! Game continues...')
      } else {
        await this.gameFlowUseCase.endRound(this.gameId)
        this.gamePresenter.presentGameMessage('Round ended!')
        await this.handleRoundEnd()
      }

      this.gamePresenter.presentKoikoiDialog(false)

      const updatedGameState = await this.gameRepository.getGameState(this.gameId)
      if (updatedGameState) {
        const gameStateDTO = this.mapGameStateToDTO(updatedGameState)
        this.gamePresenter.presentGameState(gameStateDTO)
      }

      this.gamePresenter.presentKoikoiDecision({
        success: true,
        nextPhase: input.declareKoikoi ? 'playing' : 'round_end',
      })
    } catch (error) {
      this.gamePresenter.presentKoikoiDecision({
        success: false,
        nextPhase: '',
        error: `Error handling Koi-Koi: ${error}`,
      })
    }
  }

  async startNextRound(): Promise<void> {
    if (!this.gameId) {
      this.gamePresenter.presentError('No active game')
      return
    }

    try {
      const updatedGameState = await this.gameFlowUseCase.startNextRound(this.gameId)
      const gameStateDTO = this.mapGameStateToDTO(updatedGameState)
      this.gamePresenter.presentGameState(gameStateDTO)

      if (updatedGameState.isGameOver) {
        const winner = await this.gameFlowUseCase.getGameWinner(this.gameId)
        this.gamePresenter.presentGameEnd(winner ? winner.name : null, winner ? winner.score : 0)
      } else {
        this.gamePresenter.presentGameMessage(`Round ${updatedGameState.round} started!`)
      }
    } catch (error) {
      this.gamePresenter.presentError(`Error starting next round: ${error}`)
    }
  }

  async getCurrentGameState(): Promise<void> {
    if (!this.gameId) {
      this.gamePresenter.presentError('No active game')
      return
    }

    try {
      const gameState = await this.gameRepository.getGameState(this.gameId)
      if (gameState) {
        const gameStateDTO = this.mapGameStateToDTO(gameState)
        this.gamePresenter.presentGameState(gameStateDTO)
      }
    } catch (error) {
      this.gamePresenter.presentError(`Error getting game state: ${error}`)
    }
  }

  private async handleRoundEnd(): Promise<void> {
    try {
      const gameState = await this.gameRepository.getGameState(this.gameId)
      if (!gameState) return

      const roundResult = gameState.roundResult
      if (roundResult) {
        if (roundResult.winner) {
          this.gamePresenter.presentRoundEnd(roundResult.winner.name, roundResult.score)
        } else {
          this.gamePresenter.presentGameMessage('Round ended in a draw!')
        }
      }
    } catch (error) {
      this.gamePresenter.presentError(`Error handling round end: ${error}`)
    }
  }

  private mapGameStateToDTO(gameState: any): GameStateOutputDTO {
    return {
      gameId: this.gameId,
      players: gameState.players,
      currentPlayer: gameState.currentPlayer,
      fieldCards: gameState.field || [],
      deckCount: gameState.deckCount || 0,
      round: gameState.round || 1,
      phase: gameState.phase || 'setup',
      isGameOver: gameState.isGameOver || false,
      lastMove: gameState.lastMove,
      roundResult: gameState.roundResult,
      koikoiPlayer: gameState.koikoiPlayer,
    }
  }

  getGameId(): string {
    return this.gameId
  }
}
