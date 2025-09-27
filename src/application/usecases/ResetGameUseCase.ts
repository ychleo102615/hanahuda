import type { GameRepository } from '../ports/repositories/GameRepository'
import type { GamePresenter } from '../ports/presenters/GamePresenter'

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
    private presenter?: GamePresenter,
  ) {}

  async execute(input: ResetGameInputDTO): Promise<ResetGameOutputDTO> {
    try {
      // 如果有指定的遊戲ID，則重置該遊戲
      if (input.gameId) {
        await this.gameRepository.deleteGame(input.gameId)
      }

      // 清空所有遊戲狀態
      await this.gameRepository.clearAllGames()

      // 清空 UI 狀態
      if (this.presenter) {
        this.presenter.clearYakuDisplay()
        this.presenter.presentKoikoiDialog(false)
        this.presenter.presentCardSelection(null, null)
        this.presenter.clearError()
        this.presenter.presentGameMessage('game.messages.gameReset')

        // 重置遊戲狀態到初始狀態
        this.presenter.presentGameReset()
      }

      return {
        success: true,
      }
    } catch (error) {
      const errorMessage = `Error resetting game: ${error}`

      if (this.presenter) {
        this.presenter.presentError('errors.resetGameFailed', { error: String(error) })
      }

      return {
        success: false,
        error: errorMessage,
      }
    }
  }
}