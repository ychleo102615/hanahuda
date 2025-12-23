/**
 * Game Logs Table Schema
 *
 * @description
 * 儲存遊戲事件日誌，用於稽核、問題分析和遊戲重播功能。
 * 實作 Event Sourcing 模式，記錄所有遊戲狀態變更事件。
 *
 * 參考: specs/009-backend-testing-logging/data-model.md
 */

import { pgTable, bigserial, uuid, varchar, jsonb, timestamp, index } from 'drizzle-orm/pg-core'

/**
 * 遊戲日誌事件類型
 *
 * 使用 SSE 協議名稱，統一命令和事件的命名風格。
 *
 * Commands (由 Use Cases 記錄):
 * - PlayHandCard, SelectTarget, MakeDecision, LeaveGame
 *
 * Events (由 CompositeEventPublisher 記錄):
 * - GameStarted, GameFinished, RoundDealt, RoundEnded, TurnCompleted, etc.
 */
export type GameLogEventType =
  // Commands (Use Cases 記錄)
  | 'PlayHandCard'
  | 'SelectTarget'
  | 'MakeDecision'
  | 'LeaveGame'
  // Events (SSE 事件)
  | 'GameStarted'
  | 'GameFinished'
  | 'RoundDealt'
  | 'RoundEnded'
  | 'TurnCompleted'
  | 'TurnProgressAfterSelection'
  | 'DecisionMade'

/**
 * Game Logs 表
 *
 * 用於記錄遊戲中的所有事件，支援遊戲重播和問題分析。
 */
export const gameLogs = pgTable('game_logs', {
  /** 日誌 ID (遞增整數) */
  id: bigserial('id', { mode: 'number' }).primaryKey(),

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
