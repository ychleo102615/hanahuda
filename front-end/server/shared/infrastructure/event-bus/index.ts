/**
 * Shared Infrastructure - Event Bus Barrel Export
 *
 * @description
 * 統一匯出事件匯流排相關模組。
 * 各 BC 應透過此檔案 import 事件匯流排。
 *
 * @module server/shared/infrastructure/event-bus
 */

// Types
export type {
  MatchFoundPayload,
  MatchType,
  EventType,
} from './types'
export { EVENT_TYPES } from './types'

// Internal Event Bus (BC 間內部通訊)
export type {
  IInternalEventBus,
  Unsubscribe,
  MatchFoundHandler,
} from './internalEventBus'
export { internalEventBus } from './internalEventBus'

// Player Event Bus (Gateway 發送事件給前端)
export type {
  GatewayEvent,
  GatewayEventDomain,
  PlayerEventHandler,
  IPlayerEventBus,
  Unsubscribe as PlayerUnsubscribe,
} from './playerEventBus'
export {
  playerEventBus,
  createGatewayEvent,
  createMatchmakingEvent,
  createGameEvent,
} from './playerEventBus'
