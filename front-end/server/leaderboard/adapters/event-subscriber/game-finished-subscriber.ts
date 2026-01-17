/**
 * GameFinishedSubscriber
 *
 * @description
 * 訂閱 GAME_FINISHED 事件，觸發玩家記錄更新。
 *
 * @module server/leaderboard/adapters/event-subscriber/game-finished-subscriber
 */

import {
  internalEventBus,
  type Unsubscribe,
} from '~~/server/shared/infrastructure/event-bus/internalEventBus'
import type { GameFinishedPayload } from '~~/server/shared/infrastructure/event-bus/types'
import type { UpdatePlayerRecordsInputPort } from '~~/server/leaderboard/application/ports/input/update-player-records-input-port'

/**
 * GameFinishedSubscriber
 *
 * @description
 * 監聽 GAME_FINISHED 事件並觸發玩家記錄更新。
 */
export class GameFinishedSubscriber {
  private unsubscribe: Unsubscribe | null = null

  constructor(
    private readonly updatePlayerRecordsUseCase: UpdatePlayerRecordsInputPort
  ) {}

  /**
   * 開始訂閱
   */
  subscribe(): void {
    if (this.unsubscribe) {
      return // 已訂閱
    }

    this.unsubscribe = internalEventBus.onGameFinished(
      this.handleGameFinished.bind(this)
    )

    console.log('[GameFinishedSubscriber] Subscribed to GAME_FINISHED events')
  }

  /**
   * 取消訂閱
   */
  unsubscribeAll(): void {
    if (this.unsubscribe) {
      this.unsubscribe()
      this.unsubscribe = null
      console.log('[GameFinishedSubscriber] Unsubscribed from GAME_FINISHED events')
    }
  }

  /**
   * 處理 GAME_FINISHED 事件
   */
  private async handleGameFinished(payload: GameFinishedPayload): Promise<void> {
    try {
      await this.updatePlayerRecordsUseCase.execute({
        gameId: payload.gameId,
        winnerId: payload.winnerId,
        finalScores: payload.finalScores,
        players: payload.players,
        finishedAt: payload.finishedAt,
      })

      console.log('[GameFinishedSubscriber] Player records updated', {
        gameId: payload.gameId,
        winnerId: payload.winnerId,
      })
    }
    catch (error) {
      console.error('[GameFinishedSubscriber] Failed to update player records', {
        gameId: payload.gameId,
        error,
      })
    }
  }
}
