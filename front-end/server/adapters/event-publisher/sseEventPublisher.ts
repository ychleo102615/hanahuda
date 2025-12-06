/**
 * SSEEventPublisher - Adapter Layer
 *
 * @description
 * 實作 EventPublisherPort，使用 connectionStore 廣播 SSE 事件。
 *
 * @module server/adapters/event-publisher/sseEventPublisher
 */

import type { EventPublisherPort } from '~~/server/application/ports/output/eventPublisherPort'
import type { GameEvent, GameStartedEvent, RoundDealtEvent } from '#shared/contracts'
import { connectionStore } from './connectionStore'

/**
 * SSEEventPublisher
 *
 * 實作 EventPublisherPort，將事件廣播到 SSE 連線
 */
export class SSEEventPublisher implements EventPublisherPort {
  /**
   * 發佈通用遊戲事件到指定遊戲
   *
   * @param gameId - 遊戲 ID
   * @param event - 遊戲事件
   */
  publishToGame(gameId: string, event: GameEvent): void {
    const connectionCount = connectionStore.getConnectionCount(gameId)

    if (connectionCount === 0) {
      console.log(`[SSEEventPublisher] No connections for game ${gameId}, event queued/skipped`)
      return
    }

    connectionStore.broadcast(gameId, event)
    console.log(`[SSEEventPublisher] Broadcast ${event.event_type} to game ${gameId} (${connectionCount} connections)`)
  }

  /**
   * 發佈遊戲開始事件
   *
   * @param gameId - 遊戲 ID
   * @param event - 遊戲開始事件
   */
  publishGameStarted(gameId: string, event: GameStartedEvent): void {
    this.publishToGame(gameId, event)
  }

  /**
   * 發佈發牌事件
   *
   * @param gameId - 遊戲 ID
   * @param event - 發牌事件
   */
  publishRoundDealt(gameId: string, event: RoundDealtEvent): void {
    this.publishToGame(gameId, event)
  }
}

/**
 * SSEEventPublisher 單例
 */
export const sseEventPublisher = new SSEEventPublisher()
