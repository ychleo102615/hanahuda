import type { GameFlowUseCase } from '@/application/usecases/GameFlowUseCase'
import type {
  StartGameInputDTO,
  PlayCardInputDTO,
  KoikoiDecisionInputDTO,
} from '@/application/dto/GameDTO'

export class GameController {
  private gameId: string = ''

  constructor(
    private gameFlowUseCase: GameFlowUseCase,
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
      await this.gameFlowUseCase.handleKoikoiDecision(this.gameId, input.playerId, input.declareKoikoi)
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

  getGameId(): string {
    return this.gameId
  }
}
