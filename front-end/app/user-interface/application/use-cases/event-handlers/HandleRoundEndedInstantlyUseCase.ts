/**
 * HandleRoundEndedInstantlyUseCase
 */

import type { RoundEndedInstantlyEvent } from '#shared/contracts'
import type { UIStatePort, NotificationPort, GameStatePort } from '../../ports/output'
import type { HandleRoundEndedInstantlyPort, ExecuteOptions } from '../../ports/input'

export class HandleRoundEndedInstantlyUseCase implements HandleRoundEndedInstantlyPort {
  constructor(
    private readonly updateUIState: UIStatePort,
    private readonly notification: NotificationPort,
    private readonly gameState: GameStatePort
  ) {}

  execute(event: RoundEndedInstantlyEvent, _options: ExecuteOptions): void {
    // 0. 清理：停止倒數計時、清除流程階段
    this.notification.cleanup()
    this.gameState.setFlowStage(null)

    // 1. 更新分數
    const player1Score = event.updated_total_scores.find((s) => s.player_id === 'player-1')?.score || 0
    const player2Score = event.updated_total_scores.find((s) => s.player_id === 'player-2')?.score || 0
    this.updateUIState.updateScores(player1Score, player2Score)

    // 2. 顯示特殊結束面板
    this.notification.showRoundEndedInstantlyModal(
      event.reason,
      event.winner_id,
      event.awarded_points,
      [...event.updated_total_scores]
    )

    // 3. 啟動顯示倒數（若有值，倒數結束時自動關閉面板）
    // 無值時表示最後一回合，面板需手動關閉
    if (event.display_timeout_seconds !== undefined) {
      this.notification.startDisplayCountdown(event.display_timeout_seconds, () => {
        this.notification.hideModal()
      })
    }
  }
}
