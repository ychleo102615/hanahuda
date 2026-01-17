/**
 * Daily Player Scores Table Schema
 *
 * @description
 * 每日玩家分數快照表，用於支援日/週排行榜查詢。
 * 由 Leaderboard BC 擁有，透過 GAME_FINISHED 事件驅動更新。
 * 資料保留 30 天，由 dailyScoreCleanup plugin 定時清理。
 *
 * @module server/database/schema/dailyPlayerScores
 */

import { pgTable, uuid, date, integer, timestamp, primaryKey, index } from 'drizzle-orm/pg-core'

/**
 * Daily Player Scores Table
 *
 * @description
 * 儲存每位玩家的每日遊戲分數快照。
 * 複合主鍵: (player_id, date)
 */
export const dailyPlayerScores = pgTable('daily_player_scores', {
  /** 玩家 ID */
  playerId: uuid('player_id').notNull(),

  /** 日期 (UTC+8 台灣時間) */
  date: date('date').notNull(),

  /** 當日累計分數 */
  score: integer('score').notNull().default(0),

  /** 當日遊戲場數 */
  gamesPlayed: integer('games_played').notNull().default(0),

  /** 當日獲勝場數 */
  gamesWon: integer('games_won').notNull().default(0),

  /** 當日 Koi-Koi 宣告次數 */
  koiKoiCalls: integer('koi_koi_calls').notNull().default(0),

  /** 建立時間 */
  createdAt: timestamp('created_at').defaultNow().notNull(),

  /** 更新時間 */
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  // 複合主鍵：玩家 ID + 日期
  primaryKey({ columns: [table.playerId, table.date] }),
  // 日期索引，用於排行榜查詢和資料清理
  index('idx_daily_player_scores_date').on(table.date),
  // 分數索引，用於排行榜排序
  index('idx_daily_player_scores_score').on(table.score),
])

/**
 * 推斷的型別
 */
export type DailyPlayerScore = typeof dailyPlayerScores.$inferSelect
export type NewDailyPlayerScore = typeof dailyPlayerScores.$inferInsert
