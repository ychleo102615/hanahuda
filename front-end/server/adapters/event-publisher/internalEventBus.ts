/**
 * Internal Event Bus
 *
 * @description
 * 內部事件匯流排，僅用於 ROOM_CREATED 事件。
 * 通知 OpponentService 有新房間被建立，需要 AI 加入。
 *
 * 語意區分：
 * - InternalEventBus: 僅限 ROOM_CREATED（房間建立通知）
 * - OpponentEventBus: AI 專用遊戲事件路由
 * - GameEventBus: Normal Client 遊戲事件（SSE）
 */

import { EventEmitter } from 'events'
import type {
  InternalEventPublisherPort,
  RoomCreatedPayload,
} from '~~/server/application/ports/output/internalEventPublisherPort'

/**
 * 訂閱取消函數
 */
export type Unsubscribe = () => void

/**
 * 房間建立事件處理器類型
 */
export type RoomCreatedHandler = (payload: RoomCreatedPayload) => void

/**
 * 內部事件匯流排
 *
 * @description
 * 使用 Node.js EventEmitter 實現的內部事件發佈訂閱系統。
 * 僅用於 ROOM_CREATED 事件，不處理遊戲進行中的事件。
 */
class InternalEventBus implements InternalEventPublisherPort {
  private emitter: EventEmitter

  constructor() {
    this.emitter = new EventEmitter()
    this.emitter.setMaxListeners(10)
  }

  /**
   * 訂閱房間建立事件
   *
   * @param handler 事件處理器
   * @returns 取消訂閱函數
   */
  onRoomCreated(handler: RoomCreatedHandler): Unsubscribe {
    this.emitter.on('ROOM_CREATED', handler)
    return () => {
      this.emitter.off('ROOM_CREATED', handler)
    }
  }

  /**
   * 發佈房間建立事件
   *
   * @param payload 房間建立事件 Payload
   */
  publishRoomCreated(payload: RoomCreatedPayload): void {
    this.emitter.emit('ROOM_CREATED', payload)
  }
}

/**
 * 內部事件匯流排單例
 */
export const internalEventBus = new InternalEventBus()
