/**
 * Games Table Schema
 *
 * @description
 * 儲存遊戲會話的基本資訊。
 * 對應 Domain Layer 的 Game Aggregate Root。
 *
 * 參考: specs/008-nuxt-backend-server/data-model.md#Games-Table
 */

import { pgTable, uuid, varchar, jsonb, timestamp, boolean, integer } from 'drizzle-orm/pg-core'
import type { PlayerScore } from '#shared/types'

/**
 * 遊戲狀態
 */
export type GameStatus = 'WAITING' | 'IN_PROGRESS' | 'FINISHED'

/**
 * Games 表
 */
export const games = pgTable('games', {
  /** 遊戲 ID (UUID v4) */
  id: uuid('id').primaryKey().defaultRandom(),

  /** 會話 Token (用於重連驗證) */
  sessionToken: uuid('session_token').unique().notNull(),

  /** 玩家 1 ID */
  player1Id: uuid('player1_id').notNull(),

  /** 玩家 1 名稱 */
  player1Name: varchar('player1_name', { length: 50 }).notNull(),

  /** 玩家 2 ID (可為 null，等待配對時) */
  player2Id: uuid('player2_id'),

  /** 玩家 2 名稱 */
  player2Name: varchar('player2_name', { length: 50 }),

  /** 玩家 2 是否為 AI */
  isPlayer2Ai: boolean('is_player2_ai').default(true).notNull(),

  /** 遊戲狀態 */
  status: varchar('status', { length: 20 }).$type<GameStatus>().notNull().default('WAITING'),

  /** 總局數 */
  totalRounds: integer('total_rounds').notNull().default(2),

  /** 已完成局數 */
  roundsPlayed: integer('rounds_played').notNull().default(0),

  /** 累計分數 */
  cumulativeScores: jsonb('cumulative_scores').$type<PlayerScore[]>().notNull().default([]),

  /** 建立時間 */
  createdAt: timestamp('created_at').defaultNow().notNull(),

  /** 更新時間 */
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

/**
 * 推斷的 Games 型別
 */
export type Game = typeof games.$inferSelect
export type NewGame = typeof games.$inferInsert
