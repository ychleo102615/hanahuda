/**
 * Sessions Table Schema
 *
 * @description
 * 儲存 Session 資訊，用於認證狀態管理。
 * 支援滑動過期（7 天有效期）。
 *
 * 參考: specs/010-player-account/data-model.md#2.4-sessions-資料表
 */

import { pgTable, varchar, uuid, timestamp, index } from 'drizzle-orm/pg-core'
import { players } from './players'

/**
 * Sessions 表
 */
export const sessions = pgTable('sessions', {
  /** Session ID (base64url encoded, 64 chars) */
  id: varchar('id', { length: 64 }).primaryKey().notNull(),

  /** 關聯的 Player ID */
  playerId: uuid('player_id').notNull().references(() => players.id, { onDelete: 'cascade' }),

  /** 建立時間 */
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),

  /** 過期時間 */
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),

  /** 最後存取時間（滑動過期用） */
  lastAccessedAt: timestamp('last_accessed_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('sessions_player_id_idx').on(table.playerId),
  index('sessions_expires_at_idx').on(table.expiresAt),
])

/**
 * 推斷的 Sessions 型別
 */
export type Session = typeof sessions.$inferSelect
export type NewSession = typeof sessions.$inferInsert
