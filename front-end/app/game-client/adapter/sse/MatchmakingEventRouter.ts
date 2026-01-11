/**
 * MatchmakingEventRouter - 配對 SSE 事件路由器
 *
 * @description
 * 將配對 SSE 事件類型映射到對應的 Input Port，負責事件分發。
 * 參照 EventRouter 設計。
 *
 * @example
 * ```typescript
 * const router = new MatchmakingEventRouter()
 * router.register('MatchmakingStatus', handleMatchmakingStatusPort)
 * router.route('MatchmakingStatus', payload)
 * ```
 *
 * @module app/game-client/adapter/sse/MatchmakingEventRouter
 */

import type { EventHandlerPort, ExecuteOptions } from '~/game-client/application/ports/input'
import type { MatchmakingSSEEventType } from '#shared/contracts'

/**
 * MatchmakingEventRouter 類別
 *
 * @description
 * 使用 Map 儲存事件類型與 Input Port 的映射關係。
 * 支援註冊、路由、清除等操作。
 */
export class MatchmakingEventRouter {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handlers: Map<MatchmakingSSEEventType, EventHandlerPort<any>> = new Map()

  /**
   * 註冊事件處理器
   *
   * @param eventType - 配對 SSE 事件類型
   * @param port - Event Handler Port 實例
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register(eventType: MatchmakingSSEEventType, port: EventHandlerPort<any>): void {
    this.handlers.set(eventType, port)
  }

  /**
   * 路由事件到對應的 Event Handler Port
   *
   * @param eventType - 配對 SSE 事件類型
   * @param payload - 事件 payload
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  route(eventType: MatchmakingSSEEventType, payload: any): void {
    const port = this.handlers.get(eventType)

    if (!port) {
      return
    }

    const options: ExecuteOptions = { receivedAt: Date.now() }
    port.execute(payload, options)
  }

  /**
   * 取消註冊事件處理器
   */
  unregister(eventType: MatchmakingSSEEventType): void {
    this.handlers.delete(eventType)
  }

  /**
   * 清除所有事件處理器
   */
  clear(): void {
    this.handlers.clear()
  }
}
