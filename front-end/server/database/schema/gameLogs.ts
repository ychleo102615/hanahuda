/**
 * Game Logs Table Schema
 *
 * @description
 * 儲存遊戲事件日誌，用於稽核、問題分析和遊戲重播功能。
 * 實作 Event Sourcing 模式，記錄所有遊戲狀態變更事件。
 *
 * 參考: specs/009-backend-testing-logging/data-model.md
 */

import { pgTable, bigserial, integer, uuid, varchar, jsonb, timestamp, index } from 'drizzle-orm/pg-core'
import type { GameEvent } from '#shared/contracts'
import { EVENT_TYPES } from '#shared/contracts'

// ============================================================================
// Command Type Constants (SSOT for Use Case commands)
// ============================================================================

/**
 * 命令類型常數（Single Source of Truth）
 *
 * @description
 * Use Case 記錄的命令類型。
 * 這些不是 SSE 事件，而是玩家/系統的輸入命令。
 */
export const COMMAND_TYPES = {
  PlayHandCard: 'PlayHandCard',
  SelectTarget: 'SelectTarget',
  MakeDecision: 'MakeDecision',
  LeaveGame: 'LeaveGame',
  CreateGame: 'CreateGame',
  JoinExistingGame: 'JoinExistingGame',
  JoinGameAsAi: 'JoinGameAsAi',
  ReconnectGame: 'ReconnectGame',
  ReconnectGameFailed: 'ReconnectGameFailed',
} as const

/**
 * 命令類型的值型別
 */
export type CommandTypeValue = typeof COMMAND_TYPES[keyof typeof COMMAND_TYPES]

// ============================================================================
// GameLogEventType
// ============================================================================

/**
 * 需要記錄的 SSE 事件類型（從 GameEvent 推導）
 *
 * @description
 * 使用 Extract 從 GameEvent 聯合型別中提取需要記錄的事件類型。
 * 這確保型別與 EVENT_TYPES 常數保持一致。
 *
 * 注意：SelectionRequired 和 DecisionRequired 也需要記錄，
 * 因為它們包含翻開的牌堆牌資訊，對於遊戲重播是必要的。
 */
type LoggableSseEventType = Extract<
  GameEvent['event_type'],
  | typeof EVENT_TYPES.GameStarted
  | typeof EVENT_TYPES.GameFinished
  | typeof EVENT_TYPES.RoundDealt
  | typeof EVENT_TYPES.RoundEnded
  | typeof EVENT_TYPES.TurnCompleted
  | typeof EVENT_TYPES.SelectionRequired
  | typeof EVENT_TYPES.TurnProgressAfterSelection
  | typeof EVENT_TYPES.DecisionRequired
  | typeof EVENT_TYPES.DecisionMade
>

/**
 * 遊戲日誌事件類型
 *
 * @description
 * 結合命令類型和可記錄的 SSE 事件類型。
 *
 * Commands (由 Use Cases 記錄):
 * - PlayHandCard, SelectTarget, MakeDecision, LeaveGame
 *
 * Events (由 CompositeEventPublisher 記錄):
 * - GameStarted, GameFinished, RoundDealt, RoundEnded, TurnCompleted, etc.
 */
export type GameLogEventType = CommandTypeValue | LoggableSseEventType

/**
 * Game Logs 表
 *
 * 用於記錄遊戲中的所有事件，支援遊戲重播和問題分析。
 */
export const gameLogs = pgTable('game_logs', {
  /** 日誌 ID (遞增整數) */
  id: bigserial('id', { mode: 'number' }).primaryKey(),

  /** 應用層序號（保證寫入順序） */
  sequenceNumber: integer('sequence_number').notNull(),

  /** 遊戲 ID */
  gameId: uuid('game_id').notNull(),

  /** 觸發事件的玩家 ID (系統事件為 null) */
  playerId: varchar('player_id', { length: 100 }),

  /** 事件類型 */
  eventType: varchar('event_type', { length: 100 }).$type<GameLogEventType>().notNull(),

  /** 事件參數 (JSON) */
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),

  /** 事件發生時間 */
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  // B-tree index for gameId queries
  index('idx_game_logs_game_id').on(table.gameId),
  // Note: BRIN index for createdAt will be added in migration SQL
])

/**
 * Game Log 查詢結果類型
 */
export type GameLog = typeof gameLogs.$inferSelect

/**
 * 新增 Game Log 的輸入類型
 */
export type NewGameLog = typeof gameLogs.$inferInsert
