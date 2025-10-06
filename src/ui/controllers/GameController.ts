import type { GetMatchingCardsUseCase } from '@/features/game-engine/application/usecases/GetMatchingCardsUseCase'
import type {
  StartGameInputDTO,
  PlayCardInputDTO,
  KoikoiDecisionInputDTO,
} from '@/features/game-engine/application/dto/GameDTO'
import type { Card } from '@/features/game-engine/domain/entities/Card'
import type { GameUICoordinator } from '@/features/game-ui/application/coordinators/GameUICoordinator'

export class GameController {
  private gameId: string = ''

  constructor(
    private gameUICoordinator: GameUICoordinator,
    private getMatchingCardsUseCase: GetMatchingCardsUseCase,
  ) {}

  async startNewGame(input: StartGameInputDTO): Promise<void> {
    try {
      const newGameId = await this.gameUICoordinator.startNewGame(input)
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
      await this.gameUICoordinator.playCard(this.gameId, input)
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
      await this.gameUICoordinator.makeKoikoiDecision(this.gameId, input)
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
      await this.gameUICoordinator.startNextRound(this.gameId)
    } catch (error) {
      console.error('Error starting next round:', error)
      throw error
    }
  }

  async resetGame(): Promise<void> {
    try {
      await this.gameUICoordinator.resetGame(this.gameId)
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
