/**
 * DrizzlePlayerStatsRepository - Adapter Layer
 *
 * @description
 * 實作 PlayerStatsRepositoryPort，將玩家統計持久化到 PostgreSQL。
 * 使用 Drizzle ORM 進行資料庫操作。
 *
 * @module server/leaderboard/adapters/persistence/drizzle-player-stats-repository
 */

import { eq, sql } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type { PlayerStatsRepositoryPort } from '~~/server/leaderboard/application/ports/output/player-stats-repository-port'
import type { PlayerStats } from '~~/server/leaderboard/domain/player-stats/player-stats'
import { playerStats } from '~~/server/database/schema'

type DrizzleDatabase = PostgresJsDatabase<Record<string, unknown>>

/**
 * DrizzlePlayerStatsRepository
 *
 * 實作 PlayerStatsRepositoryPort，處理玩家統計的持久化操作。
 */
export class DrizzlePlayerStatsRepository implements PlayerStatsRepositoryPort {
  constructor(private readonly db: DrizzleDatabase) {}

  /**
   * 依玩家 ID 取得統計資料
   */
  async findByPlayerId(playerId: string): Promise<PlayerStats | null> {
    const results = await this.db
      .select()
      .from(playerStats)
      .where(eq(playerStats.playerId, playerId))
      .limit(1)

    if (results.length === 0) {
      return null
    }

    const row = results[0]
    return {
      playerId: row.playerId,
      totalScore: row.totalScore,
      gamesPlayed: row.gamesPlayed,
      gamesWon: row.gamesWon,
      gamesLost: row.gamesLost,
      koiKoiCalls: row.koiKoiCalls,
      multiplierWins: row.multiplierWins,
      yakuCounts: row.yakuCounts ?? {},
    }
  }

  /**
   * 儲存玩家統計（使用 upsert）
   */
  async save(stats: PlayerStats): Promise<void> {
    await this.db
      .insert(playerStats)
      .values({
        playerId: stats.playerId,
        totalScore: stats.totalScore,
        gamesPlayed: stats.gamesPlayed,
        gamesWon: stats.gamesWon,
        gamesLost: stats.gamesLost,
        koiKoiCalls: stats.koiKoiCalls,
        multiplierWins: stats.multiplierWins,
        yakuCounts: stats.yakuCounts,
      })
      .onConflictDoUpdate({
        target: playerStats.playerId,
        set: {
          totalScore: stats.totalScore,
          gamesPlayed: stats.gamesPlayed,
          gamesWon: stats.gamesWon,
          gamesLost: stats.gamesLost,
          koiKoiCalls: stats.koiKoiCalls,
          multiplierWins: stats.multiplierWins,
          yakuCounts: stats.yakuCounts,
          updatedAt: sql`NOW()`,
        },
      })
  }

  /**
   * 透過玩家 ID 刪除統計記錄
   *
   * 用於帳號刪除時清理相關資料。
   *
   * @param playerId - 玩家 ID
   */
  async deleteByPlayerId(playerId: string): Promise<void> {
    await this.db
      .delete(playerStats)
      .where(eq(playerStats.playerId, playerId))
  }
}
