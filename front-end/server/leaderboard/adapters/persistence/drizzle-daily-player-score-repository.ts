/**
 * DrizzleDailyPlayerScoreRepository
 *
 * @description
 * 每日玩家積分儲存庫的 Drizzle 實作。
 * 透過 Drizzle ORM 操作 daily_player_scores 資料表。
 *
 * @module server/leaderboard/adapters/persistence/drizzle-daily-player-score-repository
 */

import { and, eq, gte, sql, desc } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type { DailyPlayerScore } from '~~/server/leaderboard/domain/daily-score/daily-player-score'
import type {
  DailyPlayerScoreRepositoryPort,
  LeaderboardRawData,
} from '~~/server/leaderboard/application/ports/output/daily-player-score-repository-port'
import type { LeaderboardType } from '~~/server/leaderboard/domain/leaderboard/leaderboard-type'
import { dailyPlayerScores } from '~~/server/database/schema/dailyPlayerScores'
import { players } from '~~/server/database/schema/players'
import { getTimeRangeStartDate, getDateString } from '~~/server/leaderboard/domain/statistics/time-range'

type DrizzleDatabase = PostgresJsDatabase<Record<string, unknown>>

/**
 * 每日玩家積分儲存庫 Drizzle 實作
 */
export class DrizzleDailyPlayerScoreRepository implements DailyPlayerScoreRepositoryPort {
  constructor(private readonly db: DrizzleDatabase) {}

  /**
   * 依玩家 ID 和日期取得每日積分
   */
  async findByPlayerAndDate(playerId: string, dateString: string): Promise<DailyPlayerScore | null> {
    const results = await this.db
      .select({
        playerId: dailyPlayerScores.playerId,
        date: dailyPlayerScores.date,
        score: dailyPlayerScores.score,
        gamesPlayed: dailyPlayerScores.gamesPlayed,
        gamesWon: dailyPlayerScores.gamesWon,
      })
      .from(dailyPlayerScores)
      .where(
        and(
          eq(dailyPlayerScores.playerId, playerId),
          eq(dailyPlayerScores.date, dateString)
        )
      )
      .limit(1)

    if (results.length === 0) {
      return null
    }

    const row = results[0]
    return {
      playerId: row.playerId,
      dateString: row.date,
      totalScore: row.score,
      gamesPlayed: row.gamesPlayed,
      gamesWon: row.gamesWon,
    }
  }

  /**
   * 儲存每日積分（使用 upsert）
   */
  async save(score: DailyPlayerScore): Promise<void> {
    await this.db
      .insert(dailyPlayerScores)
      .values({
        playerId: score.playerId,
        date: score.dateString,
        score: score.totalScore,
        gamesPlayed: score.gamesPlayed,
        gamesWon: score.gamesWon,
      })
      .onConflictDoUpdate({
        target: [dailyPlayerScores.playerId, dailyPlayerScores.date],
        set: {
          score: score.totalScore,
          gamesPlayed: score.gamesPlayed,
          gamesWon: score.gamesWon,
          updatedAt: sql`NOW()`,
        },
      })
  }

  /**
   * 取得排行榜資料
   */
  async getLeaderboard(type: LeaderboardType, limit: number): Promise<LeaderboardRawData[]> {
    const startDate = this.getStartDateForType(type)

    // 使用子查詢計算每位玩家的總分
    const results = await this.db
      .select({
        playerId: dailyPlayerScores.playerId,
        displayName: players.displayName,
        totalScore: sql<number>`SUM(${dailyPlayerScores.score})`.as('total_score'),
        gamesPlayed: sql<number>`SUM(${dailyPlayerScores.gamesPlayed})`.as('games_played'),
        gamesWon: sql<number>`SUM(${dailyPlayerScores.gamesWon})`.as('games_won'),
      })
      .from(dailyPlayerScores)
      .innerJoin(players, eq(dailyPlayerScores.playerId, players.id))
      .where(
        startDate
          ? gte(dailyPlayerScores.date, startDate)
          : sql`TRUE`
      )
      .groupBy(dailyPlayerScores.playerId, players.displayName)
      .having(sql`SUM(${dailyPlayerScores.score}) > 0`)
      .orderBy(desc(sql`total_score`))
      .limit(limit)

    return results.map(row => ({
      playerId: row.playerId,
      displayName: row.displayName,
      totalScore: Number(row.totalScore),
      gamesPlayed: Number(row.gamesPlayed),
      gamesWon: Number(row.gamesWon),
    }))
  }

  /**
   * 取得玩家在指定排行榜的排名
   */
  async getPlayerRank(playerId: string, type: LeaderboardType): Promise<number | null> {
    const startDate = this.getStartDateForType(type)

    // 使用 CTE 計算玩家排名（排除 0 分玩家）
    const rankQuery = sql`
      WITH player_totals AS (
        SELECT
          player_id,
          SUM(score) AS total_score
        FROM daily_player_scores
        ${startDate ? sql`WHERE date >= ${startDate}` : sql``}
        GROUP BY player_id
        HAVING SUM(score) > 0
      ),
      ranked AS (
        SELECT
          player_id,
          RANK() OVER (ORDER BY total_score DESC) AS rank
        FROM player_totals
      )
      SELECT rank FROM ranked WHERE player_id = ${playerId}
    `

    const results = await this.db.execute(rankQuery)

    if (results.length === 0) {
      return null
    }

    return Number(results[0].rank)
  }

  /**
   * 依玩家 ID 刪除所有每日積分
   */
  async deleteByPlayerId(playerId: string): Promise<void> {
    await this.db
      .delete(dailyPlayerScores)
      .where(eq(dailyPlayerScores.playerId, playerId))
  }

  /**
   * 取得排行榜類型對應的起始日期字串
   */
  private getStartDateForType(type: LeaderboardType): string | null {
    const timeRange = type === 'daily' ? 'day' : 'week'
    const startDate = getTimeRangeStartDate(timeRange)

    if (startDate === null) {
      return null
    }

    return getDateString(startDate)
  }
}
