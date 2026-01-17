/**
 * Gateway Events Contract
 *
 * @description
 * Gateway WebSocket 事件格式定義。
 * 統一前後端的 Gateway 事件結構。
 *
 * @module shared/contracts/gateway-events
 */

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
 * 統一的 Gateway WebSocket 事件結構。
 * 透過 WebSocket 傳輸 JSON 格式的事件。
 */
export interface GatewayEvent {
  readonly domain: GatewayEventDomain
  readonly type: string
  readonly payload: unknown
  readonly event_id: string
  readonly timestamp: string
}
