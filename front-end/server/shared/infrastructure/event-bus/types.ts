/**
 * Shared Infrastructure - Event Bus Types
 *
 * @description
 * 跨 Bounded Context 的事件 Payload 類型定義。
 * 這些類型定義在 Shared Infrastructure 層，不屬於任何 BC。
 * 各 BC 透過 import 這些類型來進行事件通訊。
 *
 * @module server/shared/infrastructure/event-bus/types
 */

import type { RoomTypeId } from '~~/shared/constants/roomTypes'

/**
 * Match Type - 配對類型
 */
export type MatchType = 'HUMAN' | 'BOT'

/**
 * Match Found Payload
 *
 * @description
 * 配對成功時發布的事件 Payload。
 * 由 Matchmaking BC 發布，Core Game BC 訂閱。
 */
export interface MatchFoundPayload {
  /** 第一位玩家 ID (先進入配對的玩家) */
  readonly player1Id: string
  /** 第一位玩家名稱 */
  readonly player1Name: string
  /** 第二位玩家 ID (後進入配對的玩家，或 BOT) */
  readonly player2Id: string
  /** 第二位玩家名稱 */
  readonly player2Name: string
  /** 房間類型 */
  readonly roomType: RoomTypeId
  /** 配對類型 */
  readonly matchType: MatchType
  /** 配對時間 */
  readonly matchedAt: Date
}

/**
 * Room Created Payload
 *
 * @description
 * 房間建立時發布的事件 Payload。
 * 由 Core Game BC 發布，Opponent BC 訂閱（用於 BOT 配對）。
 *
 * 此類型與 Core Game BC 的 InternalEventPublisherPort.RoomCreatedPayload 相同，
 * 移至 Shared Infrastructure 以便跨 BC 使用。
 */
export interface RoomCreatedPayload {
  /** 遊戲 ID */
  readonly gameId: string
  /** 等待中玩家的 ID */
  readonly waitingPlayerId: string
}

/**
 * Event Types - 事件類型常數
 */
export const EVENT_TYPES = {
  MATCH_FOUND: 'MATCH_FOUND',
  ROOM_CREATED: 'ROOM_CREATED',
} as const

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES]
