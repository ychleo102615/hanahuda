/**
 * MockEventEmitter - Mock SSE 事件發射器
 *
 * @description
 * 模擬 SSE 事件推送,用於開發測試。
 * 按照預設的事件腳本自動發送遊戲事件。
 *
 * @example
 * ```typescript
 * const router = new EventRouter()
 * const emitter = new MockEventEmitter(router)
 * emitter.start() // 開始發送事件
 * ```
 */

import { EventRouter } from '../sse/EventRouter'
import { mockEventScript } from './mockEventScript'

/**
 * MockEventEmitter 類別
 */
export class MockEventEmitter {
  private readonly eventRouter: EventRouter
  private currentIndex = 0
  private isRunning = false
  private timerId: number | null = null

  constructor(eventRouter: EventRouter) {
    this.eventRouter = eventRouter
  }

  /**
   * 開始發送事件
   *
   * @description
   * 按照 mockEventScript 的順序逐個發送事件。
   * 每個事件之間延遲 1 秒。
   */
  start(): void {
    if (this.isRunning) {
      console.warn('[Mock SSE] 已在運行中')
      return
    }

    console.info('[Mock SSE] 開始發送事件')
    this.isRunning = true
    this.currentIndex = 0
    this.sendNextEvent()
  }

  /**
   * 停止發送事件
   */
  stop(): void {
    if (this.timerId !== null) {
      clearTimeout(this.timerId)
      this.timerId = null
    }
    this.isRunning = false
    console.info('[Mock SSE] 停止發送事件')
  }

  /**
   * 重置到初始狀態
   */
  reset(): void {
    this.stop()
    this.currentIndex = 0
  }

  /**
   * 手動發送下一個事件
   *
   * @description
   * 用於手動控制事件發送 (逐步調試)
   */
  sendNext(): void {
    if (this.currentIndex >= mockEventScript.length) {
      console.info('[Mock SSE] 所有事件已發送完畢')
      return
    }

    const { eventType, payload, delay } = mockEventScript[this.currentIndex]
    console.info(`[Mock SSE] 發送事件 [${this.currentIndex + 1}/${mockEventScript.length}]: ${eventType}`, payload)

    this.eventRouter.route(eventType, payload)
    this.currentIndex++
  }

  /**
   * 發送下一個事件 (自動模式)
   * @private
   */
  private sendNextEvent(): void {
    if (!this.isRunning || this.currentIndex >= mockEventScript.length) {
      this.isRunning = false
      console.info('[Mock SSE] 所有事件已發送完畢')
      return
    }

    const { eventType, payload, delay } = mockEventScript[this.currentIndex]
    console.info(`[Mock SSE] 發送事件 [${this.currentIndex + 1}/${mockEventScript.length}]: ${eventType}`, payload)

    this.eventRouter.route(eventType, payload)
    this.currentIndex++

    // 延遲後發送下一個事件
    this.timerId = window.setTimeout(() => {
      this.sendNextEvent()
    }, delay || 1000)
  }
}
