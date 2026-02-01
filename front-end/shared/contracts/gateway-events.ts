/**
 * Gateway Events Contract
 *
 * @description
 * Gateway SSE 事件格式定義。
 * 統一前後端的 Gateway 事件結構。
 *
 * @module shared/contracts/gateway-events
 */

import { GAME_EVENT_TYPES, type GameEventType } from './events'
import { MATCHMAKING_EVENT_TYPE_LIST, type MatchmakingEventType } from './matchmaking-events'

/**
 * Gateway 事件領域
 */
export const GATEWAY_DOMAINS = ['MATCHMAKING', 'GAME'] as const

/**
 * Gateway 事件領域類型
 */
export type GatewayEventDomain = (typeof GATEWAY_DOMAINS)[number]

/**
 * Gateway 事件格式
 *
 * @description
 * 統一的 Gateway 事件結構。
 * 透過 SSE 傳輸 JSON 格式的事件。
 */
export interface GatewayEvent {
  readonly domain: GatewayEventDomain
  readonly type: string
  readonly payload: unknown
  readonly event_id: string
  readonly timestamp: string
}

/**
 * Gateway SSE 事件類型常數陣列
 *
 * @description
 * 合併遊戲事件和配對事件的所有類型，加上 GatewayConnected。
 * 用於 SSE EventSource 註冊事件監聽器。
 */
export const GATEWAY_SSE_EVENT_TYPES = [
  ...GAME_EVENT_TYPES,
  ...MATCHMAKING_EVENT_TYPE_LIST,
  'GatewayConnected',
] as const

/**
 * Gateway SSE 事件類型
 */
export type GatewaySSEEventType = GameEventType | MatchmakingEventType | 'GatewayConnected'
