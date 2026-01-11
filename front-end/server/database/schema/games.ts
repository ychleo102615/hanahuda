/**
 * Games Table Schema
 *
 * @description
 * 儲存遊戲會話的基本資訊。
 * 對應 Domain Layer 的 Game Aggregate Root。
 *
 * 參考: specs/008-nuxt-backend-server/data-model.md#Games-Table
 */

import { pgTable, uuid, varchar, timestamp, boolean, integer } from 'drizzle-orm/pg-core'
import type { RoomTypeId } from '~~/shared/constants/roomTypes'

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

  /** 房間類型 ID */
  roomTypeId: varchar('room_type_id', { length: 20 }).$type<RoomTypeId>().notNull().default('QUICK'),

  /** 玩家 1 ID */
  player1Id: uuid('player1_id').notNull(),

  /** 玩家 2 ID (可為 null，等待配對時) */
  player2Id: uuid('player2_id'),

  /** 玩家 2 是否為 AI */
  isPlayer2Ai: boolean('is_player2_ai').default(true).notNull(),

  /** 遊戲狀態 */
  status: varchar('status', { length: 20 }).$type<GameStatus>().notNull().default('WAITING'),

  /** 總局數 */
  totalRounds: integer('total_rounds').notNull().default(2),

  /** 已完成局數 */
  roundsPlayed: integer('rounds_played').notNull().default(0),

  /** 玩家 1 累計分數 */
  player1Score: integer('player1_score').notNull().default(0),

  /** 玩家 2 累計分數 */
  player2Score: integer('player2_score').notNull().default(0),

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
