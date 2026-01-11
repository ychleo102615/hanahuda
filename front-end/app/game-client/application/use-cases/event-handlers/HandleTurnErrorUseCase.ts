/**
 * HandleTurnErrorUseCase
 */

import type { TurnErrorEvent } from '#shared/contracts'
import type { NotificationPort } from '../../ports/output'
import type { HandleTurnErrorPort, ExecuteOptions } from '../../ports/input'

export class HandleTurnErrorUseCase implements HandleTurnErrorPort {
  constructor(private readonly notification: NotificationPort) {}

  execute(event: TurnErrorEvent, _options: ExecuteOptions): void {
    // 顯示錯誤訊息
    this.notification.showErrorMessage(event.error_message)
  }
}
