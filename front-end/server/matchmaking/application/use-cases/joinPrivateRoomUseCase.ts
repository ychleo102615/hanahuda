/**
 * JoinPrivateRoom Use Case
 *
 * @description
 * 處理訪客加入私人房間。
 * 驗證房間存在、未過期、未滿員，以及玩家狀態互斥。
 * 加入成功後房間轉為 FULL，但不立即觸發 MATCH_FOUND。
 * 等待雙方 SSE 連線就位後由 StartPrivateRoomGameUseCase 觸發。
 *
 * @module server/matchmaking/application/use-cases/joinPrivateRoomUseCase
 */

import {
  JoinPrivateRoomInputPort,
  type JoinPrivateRoomInput,
  type JoinPrivateRoomOutput,
} from '../ports/input/joinPrivateRoomInputPort'
import type { PrivateRoomRepositoryPort } from '../ports/output/privateRoomRepositoryPort'
import type { PlayerGameStatusPort } from '../ports/output/playerGameStatusPort'
import type { MatchmakingPoolPort } from '../ports/output/matchmakingPoolPort'

/**
 * JoinPrivateRoom Use Case
 */
export class JoinPrivateRoomUseCase extends JoinPrivateRoomInputPort {
  constructor(
    private readonly privateRoomRepo: PrivateRoomRepositoryPort,
    private readonly playerGameStatusPort: PlayerGameStatusPort,
    private readonly poolPort: MatchmakingPoolPort
  ) {
    super()
  }

  async execute(input: JoinPrivateRoomInput): Promise<JoinPrivateRoomOutput> {
    // 1. 查詢房間
    const room = await this.privateRoomRepo.findByRoomId(input.roomId)
    if (!room) {
      return {
        success: false,
        errorCode: 'ROOM_NOT_FOUND',
        message: 'Room not found',
      }
    }

    // 2. 檢查房間狀態
    if (room.status === 'EXPIRED' || room.status === 'DISSOLVED') {
      return {
        success: false,
        errorCode: 'ROOM_EXPIRED',
        message: 'Room has expired or been dissolved',
      }
    }

    if (room.status !== 'WAITING') {
      return {
        success: false,
        errorCode: 'ROOM_FULL',
        message: 'Room is already full',
      }
    }

    // 3. 不能加入自己的房間
    if (room.hostId === input.playerId) {
      return {
        success: false,
        errorCode: 'CANNOT_JOIN_OWN_ROOM',
        message: 'Cannot join your own room',
      }
    }

    // 4. 互斥檢查：遊戲 → 配對 → 私房
    const hasActiveGame = await this.playerGameStatusPort.hasActiveGame(input.playerId)
    if (hasActiveGame) {
      return {
        success: false,
        errorCode: 'PLAYER_IN_GAME',
        message: 'You have an active game in progress',
      }
    }

    const existingEntry = await this.poolPort.findByPlayerId(input.playerId)
    if (existingEntry) {
      return {
        success: false,
        errorCode: 'PLAYER_IN_MATCHMAKING',
        message: 'You are in the matchmaking queue',
      }
    }

    const existingRoom = await this.privateRoomRepo.findByPlayerId(input.playerId)
    if (existingRoom) {
      return {
        success: false,
        errorCode: 'PLAYER_IN_ROOM',
        message: 'You already have an active private room',
      }
    }

    // 5. 加入房間 (WAITING → FULL)
    room.join(input.playerId, input.playerName)
    await this.privateRoomRepo.save(room)

    return {
      success: true,
      roomId: room.roomId,
      hostName: room.hostName,
      roomType: room.roomType,
    }
  }
}
