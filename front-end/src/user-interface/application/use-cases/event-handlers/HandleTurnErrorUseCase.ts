/**
 * HandleTurnErrorUseCase
 */

import type { TurnErrorEvent } from '../../types/events'
import type { NotificationPort } from '../../ports/output'
import type { HandleTurnErrorPort } from '../../ports/input'

export class HandleTurnErrorUseCase implements HandleTurnErrorPort {
  constructor(private readonly notification: NotificationPort) {}

  execute(event: TurnErrorEvent): void {
    // 顯示錯誤訊息
    this.notification.showErrorMessage(event.error_message)
  }
}
