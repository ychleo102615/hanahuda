/**
 * Player Stats Table Schema
 *
 * @description
 * 儲存玩家的遊戲統計數據。
 *
 * 參考: specs/008-nuxt-backend-server/data-model.md#Player-Stats-Table
 */

import { pgTable, uuid, jsonb, timestamp, integer } from 'drizzle-orm/pg-core'

/**
 * 役種計數映射
 * key: yaku_type, value: 達成次數
 */
export type YakuCounts = Record<string, number>

/**
 * Player Stats 表
 */
export const playerStats = pgTable('player_stats', {
  /** 玩家 ID (主鍵) */
  playerId: uuid('player_id').primaryKey(),

  /** 總分數 */
  totalScore: integer('total_score').notNull().default(0),

  /** 遊戲總場數 */
  gamesPlayed: integer('games_played').notNull().default(0),

  /** 獲勝場數 */
  gamesWon: integer('games_won').notNull().default(0),

  /** 失敗場數 */
  gamesLost: integer('games_lost').notNull().default(0),

  /** 各役種達成次數 */
  yakuCounts: jsonb('yaku_counts').$type<YakuCounts>().notNull().default({}),

  /** Koi-Koi 宣告次數 */
  koiKoiCalls: integer('koi_koi_calls').notNull().default(0),

  /** 倍率獲勝次數 (透過 Koi-Koi 獲得額外分數) */
  multiplierWins: integer('multiplier_wins').notNull().default(0),

  /** 建立時間 */
  createdAt: timestamp('created_at').defaultNow().notNull(),

  /** 更新時間 */
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

/**
 * 推斷的 PlayerStats 型別
 */
export type PlayerStat = typeof playerStats.$inferSelect
export type NewPlayerStat = typeof playerStats.$inferInsert
