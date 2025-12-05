/**
 * Game Event Bus
 *
 * @description
 * 基於 EventEmitter 的遊戲事件發布訂閱系統。
 * 用於在 Use Case 和 SSE 連線之間傳遞遊戲事件。
 *
 * 參考: specs/008-nuxt-backend-server/research.md#事件發布機制
 */

import { EventEmitter } from 'events'
import type { GameEvent } from '#shared/types'

/**
 * 事件處理器類型
 */
export type GameEventHandler = (event: GameEvent) => void

/**
 * 訂閱取消函數
 */
export type Unsubscribe = () => void

/**
 * 遊戲事件匯流排
 *
 * @description
 * 使用 Node.js EventEmitter 實現的發布訂閱系統。
 * 每個遊戲有獨立的事件頻道。
 */
class GameEventBus {
  private emitter: EventEmitter

  constructor() {
    this.emitter = new EventEmitter()
    // 設置最大監聽器數量（每個遊戲最多 2 個玩家）
    this.emitter.setMaxListeners(100)
  }

  /**
   * 取得遊戲頻道名稱
   *
   * @param gameId 遊戲 ID
   * @returns 頻道名稱
   */
  private getChannel(gameId: string): string {
    return `game:${gameId}`
  }

  /**
   * 發布事件到遊戲頻道
   *
   * @param gameId 遊戲 ID
   * @param event 遊戲事件
   */
  publish(gameId: string, event: GameEvent): void {
    const channel = this.getChannel(gameId)
    this.emitter.emit(channel, event)
    console.log(`[GameEventBus] Published ${event.event_type} to game ${gameId}`)
  }

  /**
   * 訂閱遊戲頻道
   *
   * @param gameId 遊戲 ID
   * @param handler 事件處理器
   * @returns 取消訂閱函數
   */
  subscribe(gameId: string, handler: GameEventHandler): Unsubscribe {
    const channel = this.getChannel(gameId)
    this.emitter.on(channel, handler)

    console.log(`[GameEventBus] Subscribed to game ${gameId}`)

    // 返回取消訂閱函數
    return () => {
      this.emitter.off(channel, handler)
      console.log(`[GameEventBus] Unsubscribed from game ${gameId}`)
    }
  }

  /**
   * 訂閱遊戲頻道（只接收一次）
   *
   * @param gameId 遊戲 ID
   * @param handler 事件處理器
   */
  subscribeOnce(gameId: string, handler: GameEventHandler): void {
    const channel = this.getChannel(gameId)
    this.emitter.once(channel, handler)
  }

  /**
   * 取得遊戲頻道的監聽器數量
   *
   * @param gameId 遊戲 ID
   * @returns 監聽器數量
   */
  getListenerCount(gameId: string): number {
    const channel = this.getChannel(gameId)
    return this.emitter.listenerCount(channel)
  }

  /**
   * 移除遊戲頻道的所有監聽器
   *
   * @param gameId 遊戲 ID
   */
  removeAllListeners(gameId: string): void {
    const channel = this.getChannel(gameId)
    this.emitter.removeAllListeners(channel)
    console.log(`[GameEventBus] Removed all listeners for game ${gameId}`)
  }
}

/**
 * 遊戲事件匯流排單例
 */
export const gameEventBus = new GameEventBus()
