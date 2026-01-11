/**
 * GatewayEventRouter - 統一 Gateway 事件路由器
 *
 * @description
 * 將 Gateway SSE 事件根據 domain 路由到對應的子路由器：
 * - MATCHMAKING domain → MatchmakingEventRouter
 * - GAME domain → EventRouter (遊戲事件路由器)
 *
 * 設計原則：
 * - 使用 Promise 鏈確保事件依序處理（繼承自 EventRouter）
 * - 透過組合而非繼承整合現有路由器
 * - 支援序列化事件處理，避免動畫衝突
 *
 * @example
 * ```typescript
 * const gatewayRouter = new GatewayEventRouter(gameRouter, matchmakingRouter)
 * gatewayRouter.route(gatewayEvent)
 * ```
 *
 * @module app/user-interface/adapter/sse/GatewayEventRouter
 */

import type { GatewayEvent, SSEEventType, MatchmakingSSEEventType } from '#shared/contracts'
import type { EventRouter } from './EventRouter'
import type { MatchmakingEventRouter } from './MatchmakingEventRouter'

/**
 * GatewayEventRouter 類別
 *
 * @description
 * 統一的 Gateway 事件路由器，根據事件 domain 分發到對應的子路由器。
 * 使用 Promise 鏈確保事件序列化處理。
 */
export class GatewayEventRouter {
  /**
   * 事件處理鏈，用於序列化事件處理
   * @private
   */
  private eventChain: Promise<void> = Promise.resolve()

  /**
   * @param gameRouter - 遊戲事件路由器
   * @param matchmakingRouter - 配對事件路由器
   */
  constructor(
    private readonly gameRouter: EventRouter,
    private readonly matchmakingRouter: MatchmakingEventRouter
  ) {}

  /**
   * 路由 Gateway 事件到對應的子路由器
   *
   * @param event - Gateway 事件
   *
   * @description
   * 根據事件的 domain 欄位分發：
   * - MATCHMAKING → matchmakingRouter.route()
   * - GAME → gameRouter.route()
   *
   * 事件會被加入 Promise 鏈中，確保序列化處理。
   *
   * @example
   * ```typescript
   * gatewayRouter.route({
   *   domain: 'MATCHMAKING',
   *   type: 'MatchFound',
   *   payload: { game_id: '...', opponent_name: '...' },
   *   event_id: '...',
   *   timestamp: '...'
   * })
   * ```
   */
  route(event: GatewayEvent): void {
    // 將事件加入處理鏈，確保序列化
    this.eventChain = this.eventChain
      .then(() => {
        if (event.domain === 'MATCHMAKING') {
          // 路由到配對路由器
          this.matchmakingRouter.route(
            event.type as MatchmakingSSEEventType,
            event.payload
          )
        } else if (event.domain === 'GAME') {
          // 路由到遊戲路由器（GatewayConnected 由遊戲路由器處理）
          this.gameRouter.route(event.type as SSEEventType, event.payload)
        }
      })
      .catch(() => {
        // 捕獲錯誤，避免中斷事件鏈
      })
  }

  /**
   * 清空事件處理鏈
   *
   * @description
   * 用於斷線重連時重置事件鏈。
   * 同時清空子路由器的事件鏈。
   */
  clearEventChain(): void {
    this.eventChain = Promise.resolve()
    this.gameRouter.clearEventChain()
  }

  /**
   * 等待所有待處理的事件完成
   *
   * @description
   * 返回一個 Promise，當所有排隊的事件都處理完畢時 resolve。
   * 主要用於測試。
   */
  waitForPendingEvents(): Promise<void> {
    return this.eventChain
  }
}
