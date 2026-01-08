/**
 * Gateway Events Contract
 *
 * @description
 * Gateway SSE 事件格式定義。
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
 * 統一的 Gateway SSE 事件結構。
 * SSE 事件名稱格式: `${domain}:${type}` (例如: MATCHMAKING:MatchFound)
 */
export interface GatewayEvent {
  readonly domain: GatewayEventDomain
  readonly type: string
  readonly payload: unknown
  readonly event_id: string
  readonly timestamp: string
}

/**
 * Gateway SSE 事件類型常數
 *
 * @description
 * 用於前端 addEventListener 註冊。
 * 格式: `${domain}:${type}`
 */
export const GATEWAY_SSE_EVENT_TYPES = [
  // MATCHMAKING domain
  'MATCHMAKING:MatchmakingStatus',
  'MATCHMAKING:MatchFound',
  'MATCHMAKING:MatchmakingCancelled',
  'MATCHMAKING:MatchmakingRestored',
  // GAME domain
  'GAME:GatewayConnected',
  'GAME:InitialState',
  'GAME:GameStarted',
  'GAME:RoundDealt',
  'GAME:TurnCompleted',
  'GAME:SelectionRequired',
  'GAME:TurnProgressAfterSelection',
  'GAME:DecisionRequired',
  'GAME:DecisionMade',
  'GAME:RoundEnded',
  'GAME:GameFinished',
  'GAME:TurnError',
  'GAME:GameError',
  'GAME:GameSnapshotRestore',
] as const

/**
 * Gateway SSE 事件類型
 */
export type GatewaySSEEventType = (typeof GATEWAY_SSE_EVENT_TYPES)[number]
