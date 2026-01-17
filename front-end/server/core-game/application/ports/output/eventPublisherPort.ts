/**
 * EventPublisherPort - Output Port
 *
 * @description
 * Application Layer 定義的事件發佈介面，由 Adapter Layer 實作。
 * 符合 Clean Architecture 的依賴反轉原則。
 *
 * @module server/application/ports/output/eventPublisherPort
 */

import type { GameEvent, GameStartedEvent, RoundDealtEvent } from '#shared/contracts'

/**
 * 事件發佈器介面
 *
 * Application Layer 透過此介面發佈遊戲事件，
 * 不需要知道具體的實作細節（WebSocket 等）。
 */
export interface EventPublisherPort {
  /**
   * 發佈通用遊戲事件到指定遊戲
   *
   * @param gameId - 遊戲 ID
   * @param event - 遊戲事件
   */
  publishToGame(gameId: string, event: GameEvent): void

  /**
   * 發佈遊戲開始事件
   *
   * @param gameId - 遊戲 ID
   * @param event - 遊戲開始事件
   */
  publishGameStarted(gameId: string, event: GameStartedEvent): void

  /**
   * 發佈發牌事件
   *
   * @param gameId - 遊戲 ID
   * @param event - 發牌事件
   */
  publishRoundDealt(gameId: string, event: RoundDealtEvent): void

  /**
   * 發佈事件到指定玩家
   *
   * @description
   * 用於重連時發送 GameSnapshotRestore 事件給單一玩家。
   *
   * @param gameId - 遊戲 ID
   * @param playerId - 玩家 ID
   * @param event - 遊戲事件
   */
  publishToPlayer(gameId: string, playerId: string, event: GameEvent): void
}
