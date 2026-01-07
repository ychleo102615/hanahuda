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
  RoomCreatedPayload,
  MatchType,
  EventType,
} from './types'
export { EVENT_TYPES } from './types'

// Event Bus
export type {
  IInternalEventBus,
  Unsubscribe,
  MatchFoundHandler,
  RoomCreatedHandler,
} from './internalEventBus'
export { internalEventBus } from './internalEventBus'
