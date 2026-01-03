/**
 * Accounts Table Schema
 *
 * @description
 * 儲存已註冊帳號資訊，與 Player 為 1:1 關係。
 * 對應 Identity BC 的 Account Entity。
 *
 * 參考: specs/010-player-account/data-model.md#2.2-accounts-資料表
 */

import { pgTable, uuid, varchar, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'
import { players } from './players'

/**
 * Accounts 表
 */
export const accounts = pgTable('accounts', {
  /** 帳號 ID (UUID v4) */
  id: uuid('id').defaultRandom().primaryKey().notNull(),

  /** 關聯的 Player ID */
  playerId: uuid('player_id').notNull().references(() => players.id, { onDelete: 'cascade' }),

  /** 帳號名稱（唯一，3-20 字元） */
  username: varchar('username', { length: 20 }).notNull(),

  /** Email（選填，若有則唯一） */
  email: varchar('email', { length: 255 }),

  /** 密碼雜湊（bcrypt 格式） */
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),

  /** 建立時間 */
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),

  /** 更新時間 */
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('accounts_username_unique').on(table.username),
  uniqueIndex('accounts_email_unique').on(table.email),
  uniqueIndex('accounts_player_id_unique').on(table.playerId),
])

/**
 * 推斷的 Accounts 型別
 */
export type Account = typeof accounts.$inferSelect
export type NewAccount = typeof accounts.$inferInsert
