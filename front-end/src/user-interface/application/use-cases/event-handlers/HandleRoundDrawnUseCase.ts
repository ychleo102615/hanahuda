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
    this.notification.showRoundDrawnUI([...event.current_total_scores])
  }
}
