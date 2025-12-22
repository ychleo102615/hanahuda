/**
 * HandleRoundDrawnUseCase
 */

import type { RoundDrawnEvent } from '#shared/contracts'
import type { NotificationPort, GameStatePort } from '../../ports/output'
import type { HandleRoundDrawnPort, ExecuteOptions } from '../../ports/input'

export class HandleRoundDrawnUseCase implements HandleRoundDrawnPort {
  constructor(
    private readonly notification: NotificationPort,
    private readonly gameState: GameStatePort
  ) {}

  execute(event: RoundDrawnEvent, _options: ExecuteOptions): void {
    // 0. 清理：停止倒數計時、清除流程階段
    this.notification.cleanup()
    this.gameState.setFlowStage(null)

    // 顯示平局訊息
    this.notification.showRoundDrawnModal([...event.current_total_scores])

    // 啟動顯示倒數（若有值，倒數結束時自動關閉面板）
    // 無值時表示最後一回合，面板需手動關閉
    if (event.display_timeout_seconds !== undefined) {
      this.notification.startDisplayCountdown(event.display_timeout_seconds, () => {
        this.notification.hideModal()
      })
    }
  }
}
