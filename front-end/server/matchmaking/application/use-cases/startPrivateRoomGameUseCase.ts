/**
 * StartPrivateRoomGame Use Case
 *
 * @description
 * 當私人房間 FULL 且雙方 SSE 連線就位時，觸發遊戲開始。
 * 發布 MATCH_FOUND 事件，由 GameCreationHandler 建立遊戲。
 *
 * 觸發時機：events.get.ts 在 SSE 連線建立時呼叫。
 * 條件：房間狀態 FULL + 雙方 isConnected。
 *
 * @module server/matchmaking/application/use-cases/startPrivateRoomGameUseCase
 */

import {
  StartPrivateRoomGameInputPort,
  type StartPrivateRoomGameInput,
  type StartPrivateRoomGameOutput,
} from '../ports/input/startPrivateRoomGameInputPort'
import type { PrivateRoomRepositoryPort } from '../ports/output/privateRoomRepositoryPort'
import type { PlayerConnectionPort } from '../ports/output/playerConnectionPort'
import type { MatchmakingEventPublisherPort } from '../ports/output/matchmakingEventPublisherPort'
import type { PrivateRoomTimerPort } from '../ports/output/privateRoomTimerPort'

/**
 * StartPrivateRoomGame Use Case
 */
export class StartPrivateRoomGameUseCase extends StartPrivateRoomGameInputPort {
  constructor(
    private readonly privateRoomRepo: PrivateRoomRepositoryPort,
    private readonly connectionPort: PlayerConnectionPort,
    private readonly eventPublisher: MatchmakingEventPublisherPort,
    private readonly timerPort: PrivateRoomTimerPort
  ) {
    super()
  }

  async execute(input: StartPrivateRoomGameInput): Promise<StartPrivateRoomGameOutput> {
    // 1. 找到玩家所在的私人房間
    const room = await this.privateRoomRepo.findByPlayerId(input.playerId)
    if (!room) {
      return { started: false }
    }

    // 2. 只處理 FULL 狀態的房間
    if (room.status !== 'FULL') {
      return { started: false }
    }

    // 3. 確認雙方 SSE 連線就位
    const hostConnected = this.connectionPort.isConnected(room.hostId)
    const guestConnected = room.guestId ? this.connectionPort.isConnected(room.guestId) : false

    if (!hostConnected || !guestConnected) {
      return { started: false }
    }

    // 4. 清除房間計時器（遊戲即將開始）
    this.timerPort.clearTimers(room.roomId)

    // 5. 發布 MATCH_FOUND 事件
    this.eventPublisher.publishMatchFound({
      player1Id: room.hostId,
      player1Name: room.hostName,
      player2Id: room.guestId!,
      player2Name: room.guestName!,
      roomType: room.roomType,
      matchType: 'PRIVATE',
      matchedAt: new Date(),
    })

    return { started: true }
  }
}
