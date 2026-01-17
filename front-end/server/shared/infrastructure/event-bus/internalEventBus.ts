/**
 * Shared Infrastructure - Internal Event Bus
 *
 * @description
 * 跨 Bounded Context 的事件匯流排實作 (MVP: in-memory EventEmitter)。
 * 此模組作為框架級工具，不屬於任何 BC。
 *
 * 微服務遷移：只需替換此檔案為 Kafka/RabbitMQ 實作，各 BC 不需變動。
 *
 * @module server/shared/infrastructure/event-bus/internalEventBus
 */

import { EventEmitter } from 'node:events'
import type { MatchFoundPayload, AiOpponentNeededPayload } from './types'
import { EVENT_TYPES } from './types'

/**
 * 訂閱取消函數
 */
export type Unsubscribe = () => void

/**
 * 配對成功事件處理器類型
 */
export type MatchFoundHandler = (payload: MatchFoundPayload) => void

/**
 * AI 對手需求事件處理器類型
 */
export type AiOpponentNeededHandler = (payload: AiOpponentNeededPayload) => void

/**
 * Internal Event Bus Interface
 *
 * @description
 * 定義事件匯流排的公開 API，便於未來替換實作。
 */
export interface IInternalEventBus {
  // MATCH_FOUND events (Matchmaking → Core Game)
  publishMatchFound(payload: MatchFoundPayload): void
  onMatchFound(handler: MatchFoundHandler): Unsubscribe

  // AI_OPPONENT_NEEDED events (Core Game → Opponent)
  publishAiOpponentNeeded(payload: AiOpponentNeededPayload): void
  onAiOpponentNeeded(handler: AiOpponentNeededHandler): Unsubscribe
}

/**
 * Internal Event Bus Implementation
 *
 * @description
 * 使用 Node.js EventEmitter 實現的事件發佈訂閱系統 (MVP)。
 * 支援 MATCH_FOUND 事件類型（Matchmaking BC → Core Game BC）。
 */
class InternalEventBus implements IInternalEventBus {
  private readonly emitter: EventEmitter

  constructor() {
    this.emitter = new EventEmitter()
    // 設定最大監聽器數量，避免記憶體洩漏警告
    this.emitter.setMaxListeners(20)
  }

  /**
   * 發佈配對成功事件
   *
   * @description
   * 由 Matchmaking BC 呼叫，通知 Core Game BC 有玩家配對成功。
   *
   * @param payload - 配對成功事件 Payload
   */
  publishMatchFound(payload: MatchFoundPayload): void {
    this.emitter.emit(EVENT_TYPES.MATCH_FOUND, payload)
  }

  /**
   * 訂閱配對成功事件
   *
   * @description
   * 由 Core Game BC 呼叫，監聯配對成功事件以建立遊戲。
   *
   * @param handler - 事件處理器
   * @returns 取消訂閱函數
   */
  onMatchFound(handler: MatchFoundHandler): Unsubscribe {
    this.emitter.on(EVENT_TYPES.MATCH_FOUND, handler)
    return () => {
      this.emitter.off(EVENT_TYPES.MATCH_FOUND, handler)
    }
  }

  /**
   * 發佈 AI 對手需求事件
   *
   * @description
   * 由 Core Game BC 呼叫，通知 Opponent BC 需要建立 AI 對手。
   *
   * @param payload - AI 對手需求事件 Payload
   */
  publishAiOpponentNeeded(payload: AiOpponentNeededPayload): void {
    this.emitter.emit(EVENT_TYPES.AI_OPPONENT_NEEDED, payload)
  }

  /**
   * 訂閱 AI 對手需求事件
   *
   * @description
   * 由 Opponent BC 呼叫，監聽 AI 對手需求事件以建立 AI 實例。
   *
   * @param handler - 事件處理器
   * @returns 取消訂閱函數
   */
  onAiOpponentNeeded(handler: AiOpponentNeededHandler): Unsubscribe {
    this.emitter.on(EVENT_TYPES.AI_OPPONENT_NEEDED, handler)
    return () => {
      this.emitter.off(EVENT_TYPES.AI_OPPONENT_NEEDED, handler)
    }
  }
}

/**
 * Internal Event Bus 單例
 *
 * @description
 * 全域唯一的事件匯流排實例，供所有 BC 使用。
 */
export const internalEventBus: IInternalEventBus = new InternalEventBus()
