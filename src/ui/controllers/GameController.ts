import type { GameFlowUseCase } from '@/application/usecases/GameFlowUseCase'
import type { ResetGameUseCase } from '@/application/usecases/ResetGameUseCase'
import type { GetMatchingCardsUseCase } from '@/application/usecases/GetMatchingCardsUseCase'
import type {
  StartGameInputDTO,
  PlayCardInputDTO,
  KoikoiDecisionInputDTO,
} from '@/application/dto/GameDTO'
import type { Card } from '@/domain/entities/Card'

export class GameController {
  private gameId: string = ''

  constructor(
    private gameFlowUseCase: GameFlowUseCase,
    private resetGameUseCase: ResetGameUseCase,
    private getMatchingCardsUseCase: GetMatchingCardsUseCase,
  ) {}

  async startNewGame(input: StartGameInputDTO): Promise<void> {
    try {
      const newGameId = await this.gameFlowUseCase.startNewGame(input)
      this.gameId = newGameId
    } catch (error) {
      console.error('Error starting game:', error)
      throw error
    }
  }

  async playCard(input: PlayCardInputDTO): Promise<void> {
    if (!this.gameId) {
      throw new Error('No active game')
    }

    try {
      await this.gameFlowUseCase.handlePlayCard(this.gameId, input)
    } catch (error) {
      console.error('Error playing card:', error)
      throw error
    }
  }

  async handleKoikoiDecision(input: KoikoiDecisionInputDTO): Promise<void> {
    if (!this.gameId) {
      throw new Error('No active game')
    }

    try {
      await this.gameFlowUseCase.handleKoikoiDecision(
        this.gameId,
        input.playerId,
        input.declareKoikoi,
      )
    } catch (error) {
      console.error('Error handling Koi-Koi:', error)
      throw error
    }
  }

  async startNextRound(): Promise<void> {
    if (!this.gameId) {
      throw new Error('No active game')
    }

    try {
      await this.gameFlowUseCase.startNextRound(this.gameId)
    } catch (error) {
      console.error('Error starting next round:', error)
      throw error
    }
  }

  async resetGame(): Promise<void> {
    try {
      await this.resetGameUseCase.execute({ gameId: this.gameId })
      this.gameId = ''
    } catch (error) {
      console.error('Error resetting game:', error)
      throw error
    }
  }

  getGameId(): string {
    return this.gameId
  }

  async getMatchingCards(handCard: Card): Promise<{
    matchingFieldCards: Card[]
    canSelectField: boolean
  }> {
    if (!this.gameId) {
      return { matchingFieldCards: [], canSelectField: false }
    }

    try {
      const result = await this.getMatchingCardsUseCase.execute({
        gameId: this.gameId,
        handCard
      })

      return {
        matchingFieldCards: result.matchingFieldCards,
        canSelectField: result.canSelectField
      }
    } catch (error) {
      console.error('Error getting matching cards:', error)
      return { matchingFieldCards: [], canSelectField: false }
    }
  }
}
