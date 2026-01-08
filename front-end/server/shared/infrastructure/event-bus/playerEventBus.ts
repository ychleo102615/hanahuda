/**
 * Player Event Bus - Gateway 事件發布訂閱系統
 *
 * @description
 * 以 playerId 為 key 的事件發布訂閱系統。
 * 用於將 BC 事件路由到特定玩家的 SSE 連線。
 *
 * 與 internalEventBus 的區別：
 * - internalEventBus: BC 間內部通訊（MATCH_FOUND, ROOM_CREATED）
 * - playerEventBus: 發送事件給前端玩家（透過 Gateway SSE）
 *
 * @module server/shared/infrastructure/event-bus/playerEventBus
 */

import { EventEmitter } from 'node:events'
import { randomUUID } from 'crypto'

/**
 * Gateway 事件 Domain 類型
 */
export type GatewayEventDomain = 'MATCHMAKING' | 'GAME'

/**
 * Gateway 事件介面
 *
 * @description
 * 統一的事件格式，用於前端 SSE 接收。
 * SSE 事件名稱格式: `${domain}:${type}`
 */
export interface GatewayEvent {
  readonly domain: GatewayEventDomain
  readonly type: string
  readonly payload: unknown
  readonly event_id: string
  readonly timestamp: string
}

/**
 * 玩家事件處理器
 */
export type PlayerEventHandler = (event: GatewayEvent) => void

/**
 * 取消訂閱函數
 */
export type Unsubscribe = () => void

/**
 * PlayerEventBus 介面
 */
export interface IPlayerEventBus {
  /**
   * 發布事件給特定玩家
   */
  publishToPlayer(playerId: string, event: GatewayEvent): void

  /**
   * 訂閱特定玩家的事件
   */
  onPlayerEvent(playerId: string, handler: PlayerEventHandler): Unsubscribe

  /**
   * 廣播事件給多個玩家
   */
  broadcastToPlayers(playerIds: string[], event: GatewayEvent): void
}

/**
 * PlayerEventBus 實作
 *
 * @description
 * 使用 Node.js EventEmitter 實現的事件發布訂閱系統。
 * 每個玩家有獨立的事件 key，確保事件隔離。
 */
class PlayerEventBus implements IPlayerEventBus {
  private readonly emitter: EventEmitter

  constructor() {
    this.emitter = new EventEmitter()
    // 設定最大監聽器數量，支援多玩家同時連線
    this.emitter.setMaxListeners(1000)
  }

  /**
   * 取得玩家專屬的 event key
   */
  private getEventKey(playerId: string): string {
    return `player:${playerId}`
  }

  publishToPlayer(playerId: string, event: GatewayEvent): void {
    this.emitter.emit(this.getEventKey(playerId), event)
  }

  onPlayerEvent(playerId: string, handler: PlayerEventHandler): Unsubscribe {
    const eventKey = this.getEventKey(playerId)
    this.emitter.on(eventKey, handler)
    return () => {
      this.emitter.off(eventKey, handler)
    }
  }

  broadcastToPlayers(playerIds: string[], event: GatewayEvent): void {
    for (const playerId of playerIds) {
      this.publishToPlayer(playerId, event)
    }
  }
}

/**
 * PlayerEventBus 單例
 */
export const playerEventBus: IPlayerEventBus = new PlayerEventBus()

// ============================================================================
// 輔助函數
// ============================================================================

/**
 * 建立 GatewayEvent
 *
 * @param domain - 事件 Domain (MATCHMAKING | GAME)
 * @param type - 事件類型
 * @param payload - 事件 payload
 */
export function createGatewayEvent(
  domain: GatewayEventDomain,
  type: string,
  payload: unknown
): GatewayEvent {
  return {
    domain,
    type,
    payload,
    event_id: randomUUID(),
    timestamp: new Date().toISOString(),
  }
}

/**
 * 建立配對事件
 */
export function createMatchmakingEvent(type: string, payload: unknown): GatewayEvent {
  return createGatewayEvent('MATCHMAKING', type, payload)
}

/**
 * 建立遊戲事件
 */
export function createGameEvent(type: string, payload: unknown): GatewayEvent {
  return createGatewayEvent('GAME', type, payload)
}
