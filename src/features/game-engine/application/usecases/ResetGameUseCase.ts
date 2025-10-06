import type { GameRepository } from '../ports/repositories/GameRepository'

export interface ResetGameInputDTO {
  gameId?: string
}

export interface ResetGameOutputDTO {
  success: boolean
  error?: string
}

export class ResetGameUseCase {
  constructor(
    private gameRepository: GameRepository,
  ) {}

  async execute(input: ResetGameInputDTO): Promise<ResetGameOutputDTO> {
    try {
      // 如果有指定的遊戲ID，則重置該遊戲
      if (input.gameId) {
        await this.gameRepository.deleteGame(input.gameId)
      }

      // 清空所有遊戲狀態
      await this.gameRepository.clearAllGames()

      return {
        success: true,
      }
    } catch (error) {
      const errorMessage = `Error resetting game: ${error}`

      return {
        success: false,
        error: errorMessage,
      }
    }
  }
}