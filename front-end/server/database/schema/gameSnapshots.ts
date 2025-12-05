/**
 * Game Snapshots Table Schema
 *
 * @description
 * 儲存遊戲狀態快照，用於斷線重連時恢復遊戲狀態。
 *
 * 參考: specs/008-nuxt-backend-server/data-model.md#Game-Snapshots-Table
 */

import { pgTable, uuid, jsonb, timestamp, integer, index } from 'drizzle-orm/pg-core'
import type { FlowState, KoiStatus, CardPlay } from '#shared/contracts'
import { games } from './games'

/**
 * 等待選擇的配對資訊
 */
export interface PendingSelection {
  readonly drawnCard: string
  readonly possibleTargets: readonly string[]
  readonly handCardPlay: CardPlay
}

/**
 * 玩家局內狀態
 */
export interface PlayerRoundStateSnapshot {
  readonly playerId: string
  readonly hand: string[]
  readonly depository: string[]
}

/**
 * 局快照結構
 */
export interface RoundSnapshot {
  readonly dealerId: string
  readonly field: string[]
  readonly deck: string[]
  readonly playerStates: PlayerRoundStateSnapshot[]
  readonly flowState: FlowState
  readonly activePlayerId: string
  readonly koiStatuses: KoiStatus[]
  readonly pendingSelection: PendingSelection | null
}

/**
 * Game Snapshots 表
 */
export const gameSnapshots = pgTable(
  'game_snapshots',
  {
    /** 快照 ID */
    id: uuid('id').primaryKey().defaultRandom(),

    /** 關聯的遊戲 ID */
    gameId: uuid('game_id')
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),

    /** 局數 */
    roundNumber: integer('round_number').notNull(),

    /** 局狀態快照 */
    snapshot: jsonb('snapshot').$type<RoundSnapshot>().notNull(),

    /** 建立時間 */
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('game_snapshots_game_id_idx').on(table.gameId)],
)

/**
 * 推斷的 GameSnapshots 型別
 */
export type GameSnapshot = typeof gameSnapshots.$inferSelect
export type NewGameSnapshot = typeof gameSnapshots.$inferInsert
