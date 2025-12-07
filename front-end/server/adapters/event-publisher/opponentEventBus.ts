/**
 * Opponent Event Bus
 *
 * @description
 * AI 專用遊戲事件匯流排，與 GameEventBus（SSE 用）平行的通道。
 * 專門給 OpponentService 使用，接收遊戲事件並觸發 AI 行動。
 *
 * 事件路由由 SSEEventPublisher Adapter 負責：
 * - 若目標玩家是 Normal Client → 發到 GameEventBus (SSE)
 * - 若目標玩家是 AI → 發到 OpponentEventBus
 */

import { EventEmitter } from 'events'
import type { GameEvent } from '#shared/contracts'

/**
 * 訂閱取消函數
 */
export type Unsubscribe = () => void

/**
 * 遊戲事件處理器類型
 */
export type OpponentEventHandler = (event: GameEvent) => void

/**
 * AI 專用遊戲事件匯流排
 *
 * @description
 * 使用 Node.js EventEmitter 實現的發佈訂閱系統。
 * 每個遊戲有獨立的事件頻道，OpponentService 訂閱以接收 AI 相關事件。
 */
class OpponentEventBus {
  private emitter: EventEmitter

  constructor() {
    this.emitter = new EventEmitter()
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
   * 訂閱特定遊戲的事件（給 OpponentService 使用）
   *
   * @param gameId 遊戲 ID
   * @param handler 事件處理器
   * @returns 取消訂閱函數
   */
  subscribe(gameId: string, handler: OpponentEventHandler): Unsubscribe {
    const channel = this.getChannel(gameId)
    this.emitter.on(channel, handler)
    console.log(`[OpponentEventBus] Subscribed to game ${gameId}`)
    return () => {
      this.emitter.off(channel, handler)
      console.log(`[OpponentEventBus] Unsubscribed from game ${gameId}`)
    }
  }

  /**
   * 發布遊戲事件到 AI 通道
   *
   * @param gameId 遊戲 ID
   * @param event 遊戲事件
   */
  publish(gameId: string, event: GameEvent): void {
    const channel = this.getChannel(gameId)
    this.emitter.emit(channel, event)
    console.log(`[OpponentEventBus] ${event.event_type} to game ${gameId}`)
  }

  /**
   * 移除遊戲頻道的所有監聽器
   *
   * @param gameId 遊戲 ID
   */
  removeAllListeners(gameId: string): void {
    const channel = this.getChannel(gameId)
    this.emitter.removeAllListeners(channel)
    console.log(`[OpponentEventBus] Removed all listeners for game ${gameId}`)
  }
}

/**
 * AI 專用遊戲事件匯流排單例
 */
export const opponentEventBus = new OpponentEventBus()
