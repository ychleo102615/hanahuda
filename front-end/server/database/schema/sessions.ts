/**
 * Sessions Table Schema
 *
 * @description
 * 儲存玩家會話資訊，用於驗證請求和管理連線狀態。
 *
 * 參考: specs/008-nuxt-backend-server/data-model.md#Sessions-Table
 */

import { pgTable, uuid, timestamp, index } from 'drizzle-orm/pg-core'
import { games } from './games'

/**
 * Sessions 表
 */
export const sessions = pgTable(
  'sessions',
  {
    /** 會話 Token (主鍵) */
    token: uuid('token').primaryKey(),

    /** 關聯的遊戲 ID */
    gameId: uuid('game_id')
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),

    /** 玩家 ID */
    playerId: uuid('player_id').notNull(),

    /** 連線時間 */
    connectedAt: timestamp('connected_at').defaultNow().notNull(),

    /** 最後活動時間 */
    lastActivityAt: timestamp('last_activity_at').defaultNow().notNull(),

    /** 過期時間 */
    expiresAt: timestamp('expires_at').notNull(),
  },
  (table) => [index('sessions_game_id_idx').on(table.gameId)],
)

/**
 * 推斷的 Sessions 型別
 */
export type Session = typeof sessions.$inferSelect
export type NewSession = typeof sessions.$inferInsert
