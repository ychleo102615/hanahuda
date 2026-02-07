/**
 * PrivateRoomGameFinishedSubscriber
 *
 * @description
 * 訂閱 GAME_FINISHED 事件，清理已結束遊戲的私人房間。
 * 房間在遊戲開始時進入 IN_GAME 狀態，遊戲結束時需要清理。
 *
 * @module server/matchmaking/adapters/event-subscriber/privateRoomGameFinishedSubscriber
 */

import {
  internalEventBus,
  type Unsubscribe,
} from '~~/server/shared/infrastructure/event-bus/internalEventBus'
import type { GameFinishedPayload } from '~~/server/shared/infrastructure/event-bus/types'
import type { PrivateRoomRepositoryPort } from '../../application/ports/output/privateRoomRepositoryPort'
import { logger } from '~~/server/utils/logger'

/**
 * PrivateRoomGameFinishedSubscriber
 */
export class PrivateRoomGameFinishedSubscriber {
  private unsubscribe: Unsubscribe | null = null

  constructor(
    private readonly privateRoomRepo: PrivateRoomRepositoryPort
  ) {}

  /**
   * 開始訂閱
   */
  subscribe(): void {
    if (this.unsubscribe) {
      return
    }

    this.unsubscribe = internalEventBus.onGameFinished(
      this.handleGameFinished.bind(this)
    )
  }

  /**
   * 停止訂閱
   */
  unsubscribeAll(): void {
    if (this.unsubscribe) {
      this.unsubscribe()
      this.unsubscribe = null
    }
  }

  /**
   * 處理遊戲結束
   */
  private async handleGameFinished(payload: GameFinishedPayload): Promise<void> {
    // 檢查每位玩家是否在 IN_GAME 狀態的私人房間中
    for (const player of payload.players) {
      if (player.isAi) continue

      const room = await this.privateRoomRepo.findByPlayerId(player.id)
      if (room && room.status === 'IN_GAME' && room.gameId === payload.gameId) {
        await this.privateRoomRepo.delete(room.id)
        logger.info('Private room cleaned up after game finished', {
          roomId: room.roomId,
          gameId: payload.gameId,
        })
        return // 每場遊戲最多對應一個私人房間
      }
    }
  }
}
