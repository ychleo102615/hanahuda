/**
 * HandleRoomDissolvedUseCase
 *
 * @description
 * 處理 RoomDissolved 事件（房主解散或房間過期）。
 * 清除私人房間狀態，顯示通知，導航回大廳。
 *
 * @module app/game-client/application/use-cases/matchmaking/HandleRoomDissolvedUseCase
 */

import type { PrivateRoomStatePort, NavigationPort, NotificationPort } from '../../ports/output'
import type { HandleRoomDissolvedPort, ExecuteOptions } from '../../ports/input'
import type { RoomDissolvedEvent } from '#shared/contracts'

/**
 * HandleRoomDissolvedUseCase
 *
 * 實作 HandleRoomDissolvedPort Input Port
 */
export class HandleRoomDissolvedUseCase implements HandleRoomDissolvedPort {
  constructor(
    private readonly privateRoomState: PrivateRoomStatePort,
    private readonly navigation: NavigationPort,
    private readonly notification: NotificationPort
  ) {}

  /**
   * 處理 RoomDissolved 事件
   */
  execute(event: RoomDissolvedEvent, _options?: ExecuteOptions): void {
    // 清除私人房間狀態
    this.privateRoomState.clearRoom()

    // 顯示通知
    const message = event.reason === 'HOST_DISSOLVED'
      ? 'The room has been dissolved by the host.'
      : 'The room has expired.'

    this.notification.showWarningMessage(message)

    // 導航回大廳
    this.navigation.navigateToLobby()
  }
}
