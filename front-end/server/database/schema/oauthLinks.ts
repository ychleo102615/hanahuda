/**
 * OAuth Links Table Schema
 *
 * @description
 * 儲存 OAuth 綁定關係，支援多個 Provider 連結至同一 Account。
 * 對應 Identity BC 的 OAuthLink Entity。
 *
 * 參考: specs/010-player-account/data-model.md#2.3-oauth_links-資料表
 */

import { pgTable, uuid, varchar, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'
import { accounts } from './accounts'

/**
 * 支援的 OAuth Provider
 */
export type OAuthProvider = 'google' | 'line' | 'telegram'

/**
 * OAuth Links 表
 */
export const oauthLinks = pgTable('oauth_links', {
  /** OAuth Link ID (UUID v4) */
  id: uuid('id').defaultRandom().primaryKey().notNull(),

  /** 關聯的 Account ID */
  accountId: uuid('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),

  /** OAuth Provider */
  provider: varchar('provider', { length: 20 }).$type<OAuthProvider>().notNull(),

  /** Provider 的使用者 ID */
  providerUserId: varchar('provider_user_id', { length: 255 }).notNull(),

  /** Provider 提供的 Email */
  providerEmail: varchar('provider_email', { length: 255 }),

  /** 建立時間 */
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('oauth_links_provider_user_unique').on(table.provider, table.providerUserId),
])

/**
 * 推斷的 OAuthLinks 型別
 */
export type OAuthLink = typeof oauthLinks.$inferSelect
export type NewOAuthLink = typeof oauthLinks.$inferInsert
