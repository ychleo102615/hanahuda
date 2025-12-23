/**
 * HandleGameFinishedUseCase
 *
 * @description
 * 處理 GameFinished 事件。
 *
 * 特殊邏輯：
 * - 如果有回合結束面板正在顯示（最後一回合），
 *   則停止倒數並緩存 GameFinished 資料，等待玩家關閉回合面板後再顯示遊戲結束面板。
 * - 如果沒有回合結束面板，則直接顯示遊戲結束面板。
 */

import type { GameFinishedEvent } from '#shared/contracts'
import type { NotificationPort, UIStatePort, SessionContextPort, GameStatePort } from '../../ports/output'
import type { HandleGameFinishedPort, ExecuteOptions } from '../../ports/input'

export class HandleGameFinishedUseCase implements HandleGameFinishedPort {
  constructor(
    private readonly notification: NotificationPort,
    private readonly updateUIState: UIStatePort,
    private readonly sessionContext: SessionContextPort,
    private readonly gameState: GameStatePort,
  ) {}

  execute(event: GameFinishedEvent, _options: ExecuteOptions): void {
    // 0. 重置確認繼續遊戲狀態（若因確認超時而結束）
    this.notification.hideContinueConfirmation()

    // 1. 標記遊戲已結束並清除 gameId（防止重連帶舊 ID）
    this.sessionContext.setGameFinished(true)
    this.sessionContext.setGameId(null)
    this.gameState.setGameEnded(true)

    // 2. 取得當前玩家 ID
    const currentPlayerId = this.updateUIState.getLocalPlayerId()

    // 3. 判斷是否為當前玩家獲勝
    const isPlayerWinner = event.winner_id === currentPlayerId

    // 4. 準備遊戲結束資料
    const gameFinishedData = {
      winnerId: event.winner_id,
      finalScores: [...event.final_scores],
      isPlayerWinner,
    }

    // 5. 檢查是否有回合結束面板正在顯示
    if (this.notification.isRoundEndModalVisible()) {
      // 最後一回合：緩存資料，停止倒數，等待玩家關閉回合面板
      console.info('[HandleGameFinishedUseCase] 回合面板顯示中，緩存 GameFinished 資料')
      this.notification.stopCountdown()
      this.notification.setPendingGameFinished(gameFinishedData)
    } else {
      // 直接顯示遊戲結束面板
      this.notification.showGameFinishedModal(
        event.winner_id,
        [...event.final_scores],
        isPlayerWinner,
      )
    }
  }
}
