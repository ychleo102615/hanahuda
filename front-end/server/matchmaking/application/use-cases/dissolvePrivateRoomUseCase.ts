/**
 * DissolvePrivateRoom Use Case
 *
 * @description
 * 處理房主解散私人房間。
 * 驗證請求者是房主，轉換狀態為 DISSOLVED，清除計時器，刪除房間。
 * 返回受影響的訪客 ID（若有），由 Adapter 層負責發送 SSE 通知。
 *
 * @module server/matchmaking/application/use-cases/dissolvePrivateRoomUseCase
 */

import {
  DissolvePrivateRoomInputPort,
  type DissolvePrivateRoomInput,
  type DissolvePrivateRoomOutput,
} from '../ports/input/dissolvePrivateRoomInputPort'
import type { PrivateRoomRepositoryPort } from '../ports/output/privateRoomRepositoryPort'
import type { PrivateRoomTimerPort } from '../ports/output/privateRoomTimerPort'

/**
 * DissolvePrivateRoom Use Case
 */
export class DissolvePrivateRoomUseCase extends DissolvePrivateRoomInputPort {
  constructor(
    private readonly privateRoomRepo: PrivateRoomRepositoryPort,
    private readonly timerPort: PrivateRoomTimerPort
  ) {
    super()
  }

  async execute(input: DissolvePrivateRoomInput): Promise<DissolvePrivateRoomOutput> {
    // 1. 查詢房間
    const room = await this.privateRoomRepo.findByRoomId(input.roomId)
    if (!room) {
      return {
        success: false,
        errorCode: 'ROOM_NOT_FOUND',
        message: 'Room not found',
      }
    }

    // 2. 驗證是否為房主
    if (!room.isHost(input.playerId)) {
      return {
        success: false,
        errorCode: 'NOT_HOST',
        message: 'Only the host can dissolve the room',
      }
    }

    // 3. 檢查房間是否在遊戲中
    if (room.status === 'IN_GAME') {
      return {
        success: false,
        errorCode: 'ROOM_IN_GAME',
        message: 'Cannot dissolve a room with an active game',
      }
    }

    // 4. 記錄受影響的訪客 ID（由 Adapter 層負責發送 SSE 通知）
    const guestId = room.guestId

    // 5. 解散房間
    room.dissolve()
    await this.privateRoomRepo.save(room)

    // 6. 清除計時器
    this.timerPort.clearTimers(room.roomId)

    // 7. 刪除房間
    await this.privateRoomRepo.delete(room.id)

    return { success: true, guestId }
  }
}
