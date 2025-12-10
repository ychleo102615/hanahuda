/**
 * CompositeEventPublisher - Adapter Layer
 *
 * @description
 * 組合式事件發佈器，統一發佈事件到所有訂閱者：
 * 1. SSE 連線（透過 ConnectionStore）
 * 2. AI 對手（透過 OpponentStore）
 *
 * 設計原則：
 * - 不解析事件語意
 * - 不判斷誰是 AI
 * - 只負責將事件廣播到所有註冊的接收者
 * - 接收者（OpponentInstance）自己判斷是否該行動
 *
 * @module server/adapters/event-publisher/compositeEventPublisher
 */

import type { EventPublisherPort } from '~~/server/application/ports/output/eventPublisherPort'
import type { GameEvent, GameStartedEvent, RoundDealtEvent } from '#shared/contracts'
import { connectionStore } from './connectionStore'
import { opponentStore } from '~~/server/adapters/opponent/opponentStore'

/**
 * CompositeEventPublisher
 *
 * 實作 EventPublisherPort，將事件廣播到 SSE 和 AI 對手。
 */
export class CompositeEventPublisher implements EventPublisherPort {
  /**
   * 發佈通用遊戲事件到指定遊戲
   *
   * @param gameId - 遊戲 ID
   * @param event - 遊戲事件
   */
  publishToGame(gameId: string, event: GameEvent): void {
    // 1. 發布到 SSE 連線（Normal Clients）
    const connectionCount = connectionStore.getConnectionCount(gameId)
    if (connectionCount > 0) {
      connectionStore.broadcast(gameId, event)
      console.log(
        `[CompositeEventPublisher] SSE broadcast ${event.event_type} to game ${gameId} (${connectionCount} connections)`
      )
    }

    // 2. 發布到 AI 對手（若有註冊）
    const hasOpponent = opponentStore.hasOpponent(gameId)
    if (hasOpponent) {
      opponentStore.sendEvent(gameId, event)
      console.log(
        `[CompositeEventPublisher] AI broadcast ${event.event_type} to game ${gameId}`
      )
    }
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

  /**
   * 發佈事件到指定玩家
   *
   * @description
   * 用於重連時發送 GameSnapshotRestore 事件給單一玩家。
   * 僅發送到 SSE 連線，AI 不需要重連機制。
   *
   * @param gameId - 遊戲 ID
   * @param playerId - 玩家 ID
   * @param event - 遊戲事件
   */
  publishToPlayer(gameId: string, playerId: string, event: GameEvent): void {
    const success = connectionStore.sendToPlayer(gameId, playerId, event)
    if (success) {
      console.log(
        `[CompositeEventPublisher] Sent ${event.event_type} to player ${playerId} in game ${gameId}`
      )
    } else {
      console.log(
        `[CompositeEventPublisher] No connection for player ${playerId} in game ${gameId}, event not sent`
      )
    }
  }
}

/**
 * 建立 CompositeEventPublisher 實例
 *
 * @returns CompositeEventPublisher 實例
 */
export function createCompositeEventPublisher(): CompositeEventPublisher {
  return new CompositeEventPublisher()
}
