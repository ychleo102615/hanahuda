/**
 * HandleRoundDrawnUseCase
 */

import type { RoundDrawnEvent } from '../../types/events'
import type { NotificationPort } from '../../ports/output'
import type { HandleRoundDrawnPort } from '../../ports/input'

export class HandleRoundDrawnUseCase implements HandleRoundDrawnPort {
  constructor(private readonly notification: NotificationPort) {}

  execute(event: RoundDrawnEvent): void {
    // 顯示平局訊息
    this.notification.showRoundDrawnModal([...event.current_total_scores])

    // 啟動顯示倒數（用於回合結束面板自動關閉）
    // 倒數結束時自動關閉面板
    this.notification.startDisplayCountdown(event.display_timeout_seconds, () => {
      this.notification.hideModal()
    })
  }
}
