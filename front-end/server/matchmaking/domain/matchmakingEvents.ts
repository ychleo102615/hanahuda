/**
 * Matchmaking Domain Events
 *
 * @description
 * Matchmaking BC 的 Domain Events。
 * 這些事件在 Domain 層產生，由 Application 層處理並發布到 Event Bus。
 *
 * @module server/matchmaking/domain/matchmakingEvents
 */

import type { RoomTypeId } from '~~/shared/constants/roomTypes'
import type { MatchResult } from './matchResult'

/**
 * Domain Event Base
 */
interface DomainEvent {
  readonly occurredAt: Date
}

/**
 * Player Entered Queue Event
 *
 * @description
 * 當玩家成功進入配對佇列時發布。
 */
export interface PlayerEnteredQueueEvent extends DomainEvent {
  readonly eventType: 'PLAYER_ENTERED_QUEUE'
  readonly entryId: string
  readonly playerId: string
  readonly playerName: string
  readonly roomType: RoomTypeId
  readonly enteredAt: Date
}

/**
 * Match Found Event
 *
 * @description
 * 當兩位玩家配對成功時發布 (人類對人類 或 人類對機器人)。
 */
export interface MatchFoundEvent extends DomainEvent {
  readonly eventType: 'MATCH_FOUND'
  readonly matchResult: MatchResult
}

/**
 * Player Left Queue Event
 *
 * @description
 * 當玩家離開配對佇列時發布 (取消、配對成功或超時)。
 */
export interface PlayerLeftQueueEvent extends DomainEvent {
  readonly eventType: 'PLAYER_LEFT_QUEUE'
  readonly entryId: string
  readonly playerId: string
  readonly reason: 'CANCELLED' | 'MATCHED' | 'EXPIRED'
}

/**
 * Matchmaking Domain Event Union Type
 */
export type MatchmakingDomainEvent =
  | PlayerEnteredQueueEvent
  | MatchFoundEvent
  | PlayerLeftQueueEvent

/**
 * Event Factory Functions
 */

/**
 * 建立玩家進入佇列事件
 */
export function createPlayerEnteredQueueEvent(
  entryId: string,
  playerId: string,
  playerName: string,
  roomType: RoomTypeId,
  enteredAt: Date
): PlayerEnteredQueueEvent {
  return {
    eventType: 'PLAYER_ENTERED_QUEUE',
    entryId,
    playerId,
    playerName,
    roomType,
    enteredAt,
    occurredAt: new Date(),
  }
}

/**
 * 建立配對成功事件
 */
export function createMatchFoundEvent(matchResult: MatchResult): MatchFoundEvent {
  return {
    eventType: 'MATCH_FOUND',
    matchResult,
    occurredAt: new Date(),
  }
}

/**
 * 建立玩家離開佇列事件
 */
export function createPlayerLeftQueueEvent(
  entryId: string,
  playerId: string,
  reason: 'CANCELLED' | 'MATCHED' | 'EXPIRED'
): PlayerLeftQueueEvent {
  return {
    eventType: 'PLAYER_LEFT_QUEUE',
    entryId,
    playerId,
    reason,
    occurredAt: new Date(),
  }
}
