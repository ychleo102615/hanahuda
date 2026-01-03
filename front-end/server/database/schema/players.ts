/**
 * Players Table Schema
 *
 * @description
 * 儲存玩家基本資訊，包含訪客與已註冊玩家。
 * 對應 Identity BC 的 Player Aggregate Root。
 *
 * 參考: specs/010-player-account/data-model.md#2.1-players-資料表
 */

import { pgTable, uuid, varchar, boolean, timestamp } from 'drizzle-orm/pg-core'

/**
 * Players 表
 */
export const players = pgTable('players', {
  /** 玩家 ID (UUID v4) */
  id: uuid('id').defaultRandom().primaryKey().notNull(),

  /** 顯示名稱（訪客: Guest_XXXX, 註冊: 帳號名稱） */
  displayName: varchar('display_name', { length: 50 }).notNull(),

  /** 是否為訪客 */
  isGuest: boolean('is_guest').default(true).notNull(),

  /** 建立時間 */
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),

  /** 更新時間 */
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

/**
 * 推斷的 Players 型別
 */
export type Player = typeof players.$inferSelect
export type NewPlayer = typeof players.$inferInsert
