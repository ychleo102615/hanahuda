/**
 * DrizzlePlayerStatsRepository - Adapter Layer
 *
 * @description
 * 實作 PlayerStatsRepositoryPort，將玩家統計持久化到 PostgreSQL。
 * 使用 Drizzle ORM 進行資料庫操作。
 *
 * @module server/adapters/persistence/drizzlePlayerStatsRepository
 */

import { eq, sql } from 'drizzle-orm'
import type {
  PlayerStatsRepositoryPort,
  UpsertPlayerStatsInput,
} from '~~/server/core-game/application/ports/output/playerStatsRepositoryPort'
import { db } from '~~/server/utils/db'
import { playerStats, type PlayerStat, type YakuCounts } from '~~/server/database/schema'

/**
 * DrizzlePlayerStatsRepository
 *
 * 實作 PlayerStatsRepositoryPort，處理玩家統計的持久化操作。
 */
export class DrizzlePlayerStatsRepository implements PlayerStatsRepositoryPort {
  /**
   * 透過玩家 ID 查找統計
   *
   * @param playerId - 玩家 ID
   * @returns 玩家統計（若存在）
   */
  async findByPlayerId(playerId: string): Promise<PlayerStat | null> {
    const results = await db
      .select()
      .from(playerStats)
      .where(eq(playerStats.playerId, playerId))
      .limit(1)

    return results[0] ?? null
  }

  /**
   * 更新或建立玩家統計
   *
   * 使用 PostgreSQL UPSERT (ON CONFLICT DO UPDATE) 實現原子性操作。
   * 若玩家不存在則建立新記錄，若存在則累加統計數據。
   *
   * @param input - 本場遊戲的統計增量數據
   */
  async upsert(input: UpsertPlayerStatsInput): Promise<void> {
    const {
      playerId,
      scoreChange,
      isWinner,
      isLoser,
      yakuCounts,
      koiKoiCallCount,
      hadMultiplierWin,
      isRoundEndOnly,
    } = input

    // 新記錄的初始值
    // 若是局結束記錄，不計入遊戲場次
    const newRecord = {
      playerId,
      totalScore: isRoundEndOnly ? 0 : scoreChange,
      gamesPlayed: isRoundEndOnly ? 0 : 1,
      gamesWon: isRoundEndOnly ? 0 : (isWinner ? 1 : 0),
      gamesLost: isRoundEndOnly ? 0 : (isLoser ? 1 : 0),
      yakuCounts: yakuCounts,
      koiKoiCalls: koiKoiCallCount,
      multiplierWins: hadMultiplierWin ? 1 : 0,
    }

    // 根據是否為局結束記錄，決定更新哪些欄位
    const updateSet = isRoundEndOnly
      ? {
          // 局結束記錄：只更新役種/Koi-Koi/倍率
          koiKoiCalls: sql`${playerStats.koiKoiCalls} + ${koiKoiCallCount}`,
          multiplierWins: sql`${playerStats.multiplierWins} + ${hadMultiplierWin ? 1 : 0}`,
          yakuCounts: this.buildYakuCountsMergeExpression(yakuCounts),
          updatedAt: new Date(),
        }
      : {
          // 遊戲結束記錄：更新所有欄位
          totalScore: sql`${playerStats.totalScore} + ${scoreChange}`,
          gamesPlayed: sql`${playerStats.gamesPlayed} + 1`,
          gamesWon: sql`${playerStats.gamesWon} + ${isWinner ? 1 : 0}`,
          gamesLost: sql`${playerStats.gamesLost} + ${isLoser ? 1 : 0}`,
          koiKoiCalls: sql`${playerStats.koiKoiCalls} + ${koiKoiCallCount}`,
          multiplierWins: sql`${playerStats.multiplierWins} + ${hadMultiplierWin ? 1 : 0}`,
          yakuCounts: this.buildYakuCountsMergeExpression(yakuCounts),
          updatedAt: new Date(),
        }

    await db
      .insert(playerStats)
      .values(newRecord)
      .onConflictDoUpdate({
        target: playerStats.playerId,
        set: updateSet,
      })
  }

  /**
   * 建構役種計數合併的 SQL 表達式
   *
   * 使用 PostgreSQL JSONB 運算符合併兩個 JSON 物件。
   * 若 key 重複，則將值相加。
   *
   * @param newCounts - 本場的役種計數
   * @returns SQL 表達式
   */
  private buildYakuCountsMergeExpression(newCounts: Readonly<Record<string, number>>) {
    // 如果沒有新的役種，直接返回現有值
    if (Object.keys(newCounts).length === 0) {
      return playerStats.yakuCounts
    }

    // 使用 PostgreSQL 的 jsonb_each_text 和子查詢合併 JSON
    // 這個 SQL 會：
    // 1. 將現有的 yaku_counts 和新的計數合併
    // 2. 對於重複的 key，將值相加
    return sql<YakuCounts>`(
      SELECT COALESCE(jsonb_object_agg(key, value), '{}'::jsonb)
      FROM (
        SELECT key, SUM(value::int)::int as value
        FROM (
          SELECT key, value FROM jsonb_each_text(${playerStats.yakuCounts})
          UNION ALL
          SELECT key, value FROM jsonb_each_text(${JSON.stringify(newCounts)}::jsonb)
        ) combined
        GROUP BY key
      ) aggregated
    )`
  }
}

/**
 * DrizzlePlayerStatsRepository 單例
 */
export const playerStatsRepository = new DrizzlePlayerStatsRepository()
