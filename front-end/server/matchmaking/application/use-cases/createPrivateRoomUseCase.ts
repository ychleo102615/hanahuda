/**
 * CreatePrivateRoom Use Case
 *
 * @description
 * 處理建立私人房間。
 * 驗證玩家狀態互斥（不能同時在遊戲、配對、私房中），
 * 建立 PrivateRoom Aggregate，儲存並返回 roomId + expiresAt。
 *
 * Note: UseCase 不回傳 shareUrl，由 API endpoint 組裝。
 *
 * @module server/matchmaking/application/use-cases/createPrivateRoomUseCase
 */

import {
  CreatePrivateRoomInputPort,
  type CreatePrivateRoomInput,
  type CreatePrivateRoomOutput,
} from '../ports/input/createPrivateRoomInputPort'
import type { PrivateRoomRepositoryPort } from '../ports/output/privateRoomRepositoryPort'
import type { PlayerGameStatusPort } from '../ports/output/playerGameStatusPort'
import type { MatchmakingPoolPort } from '../ports/output/matchmakingPoolPort'
import type { PrivateRoomTimerPort } from '../ports/output/privateRoomTimerPort'
import { PrivateRoom } from '../../domain/privateRoom'

/**
 * 房間過期時間 (毫秒)
 */
const ROOM_EXPIRATION_MS = 10 * 60 * 1000

/**
 * 過期警告時間 (毫秒) - 8 分鐘後發送
 */
const ROOM_WARNING_MS = 8 * 60 * 1000

/**
 * CreatePrivateRoom Use Case
 */
export class CreatePrivateRoomUseCase extends CreatePrivateRoomInputPort {
  constructor(
    private readonly privateRoomRepo: PrivateRoomRepositoryPort,
    private readonly playerGameStatusPort: PlayerGameStatusPort,
    private readonly poolPort: MatchmakingPoolPort,
    private readonly timerPort: PrivateRoomTimerPort
  ) {
    super()
  }

  async execute(input: CreatePrivateRoomInput): Promise<CreatePrivateRoomOutput> {
    // 1. 檢查玩家是否有進行中的遊戲
    const hasActiveGame = await this.playerGameStatusPort.hasActiveGame(input.playerId)
    if (hasActiveGame) {
      return {
        success: false,
        errorCode: 'PLAYER_IN_GAME',
        message: 'You have an active game in progress',
      }
    }

    // 2. 檢查玩家是否在配對佇列中
    const existingEntry = await this.poolPort.findByPlayerId(input.playerId)
    if (existingEntry) {
      return {
        success: false,
        errorCode: 'PLAYER_IN_MATCHMAKING',
        message: 'You are in the matchmaking queue',
      }
    }

    // 3. 檢查玩家是否已在其他私房中
    const existingRoom = await this.privateRoomRepo.findByPlayerId(input.playerId)
    if (existingRoom) {
      return {
        success: false,
        errorCode: 'PLAYER_IN_ROOM',
        message: 'You already have an active private room',
      }
    }

    // 4. 建立私人房間
    const room = PrivateRoom.create({
      hostId: input.playerId,
      hostName: input.playerName,
      roomType: input.roomType,
    })

    // 5. 儲存
    await this.privateRoomRepo.save(room)

    // 6. 啟動計時器
    this.timerPort.setExpirationTimer(room.roomId, ROOM_EXPIRATION_MS)
    this.timerPort.setWarningTimer(room.roomId, ROOM_WARNING_MS)

    return {
      success: true,
      roomId: room.roomId,
      expiresAt: room.expiresAt,
    }
  }
}
