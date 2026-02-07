/**
 * HandleRoomExpiringUseCase
 *
 * @description
 * 處理 RoomExpiring 事件（房間即將過期警告）。
 * 顯示警告通知給用戶。
 *
 * @module app/game-client/application/use-cases/matchmaking/HandleRoomExpiringUseCase
 */

import type { NotificationPort } from '../../ports/output'
import type { HandleRoomExpiringPort, ExecuteOptions } from '../../ports/input'
import type { RoomExpiringEvent } from '#shared/contracts'

/**
 * HandleRoomExpiringUseCase
 *
 * 實作 HandleRoomExpiringPort Input Port
 */
export class HandleRoomExpiringUseCase implements HandleRoomExpiringPort {
  constructor(
    private readonly notification: NotificationPort
  ) {}

  /**
   * 處理 RoomExpiring 事件
   */
  execute(_event: RoomExpiringEvent, _options?: ExecuteOptions): void {
    this.notification.showWarningMessage('Room will expire in 2 minutes.')
  }
}
