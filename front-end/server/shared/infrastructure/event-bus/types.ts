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
 * AI Opponent Needed Payload
 *
 * @description
 * 需要 AI 對手時發布的事件 Payload。
 * 由 Core Game BC 發布，Opponent BC 訂閱。
 */
export interface AiOpponentNeededPayload {
  /** 遊戲 ID */
  readonly gameId: string
}

/**
 * Game Finished Payload
 *
 * @description
 * 遊戲結束時發布的事件 Payload。
 * 由 Core Game BC 發布，Leaderboard BC 訂閱。
 */
export interface GameFinishedPayload {
  /** 遊戲 ID */
  readonly gameId: string
  /** 獲勝者 ID (null 表示平局) */
  readonly winnerId: string | null
  /** 最終分數列表 */
  readonly finalScores: ReadonlyArray<{
    playerId: string
    score: number
    achievedYaku: string[]
    koiKoiCalls: number
    isMultiplierWin: boolean
  }>
  /** 玩家資訊列表 */
  readonly players: ReadonlyArray<{
    id: string
    isAi: boolean
  }>
  /** 遊戲結束時間 */
  readonly finishedAt: Date
}

/**
 * Event Types - 事件類型常數
 */
export const EVENT_TYPES = {
  MATCH_FOUND: 'MATCH_FOUND',
  AI_OPPONENT_NEEDED: 'AI_OPPONENT_NEEDED',
  GAME_FINISHED: 'GAME_FINISHED',
} as const

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES]
