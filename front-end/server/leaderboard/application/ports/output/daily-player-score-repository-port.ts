/**
 * DailyPlayerScoreRepositoryPort
 *
 * @description
 * 每日玩家積分儲存庫的 Port 介面。
 * Application Layer 依賴此 Port，Adapter Layer 提供實作。
 *
 * @module server/leaderboard/application/ports/output/daily-player-score-repository-port
 */

import type { DailyPlayerScore } from '~~/server/leaderboard/domain/daily-score/daily-player-score'
import type { LeaderboardType } from '~~/server/leaderboard/domain/leaderboard/leaderboard-type'

/**
 * 排行榜原始資料（未含排名）
 */
export interface LeaderboardRawData {
  readonly playerId: string
  readonly displayName: string
  readonly totalScore: number
  readonly gamesPlayed: number
  readonly gamesWon: number
}

/**
 * 每日玩家積分儲存庫 Port
 */
export interface DailyPlayerScoreRepositoryPort {
  /**
   * 依玩家 ID 和日期取得每日積分
   *
   * @param playerId - 玩家 ID
   * @param dateString - 日期字串 (YYYY-MM-DD)
   * @returns 每日積分（若不存在則返回 null）
   */
  findByPlayerAndDate(playerId: string, dateString: string): Promise<DailyPlayerScore | null>

  /**
   * 儲存每日積分（新增或更新）
   *
   * @param score - 每日積分
   */
  save(score: DailyPlayerScore): Promise<void>

  /**
   * 取得排行榜資料
   *
   * @description
   * 依據排行榜類型和限制數量取得排行榜原始資料。
   * 資料會依據總積分降序排序。
   *
   * @param type - 排行榜類型（daily 或 weekly）
   * @param limit - 限制數量
   * @returns 排行榜原始資料（按總積分降序）
   */
  getLeaderboard(type: LeaderboardType, limit: number): Promise<LeaderboardRawData[]>

  /**
   * 取得玩家在指定排行榜的排名
   *
   * @param playerId - 玩家 ID
   * @param type - 排行榜類型
   * @returns 玩家排名（若不在榜則返回 null）
   */
  getPlayerRank(playerId: string, type: LeaderboardType): Promise<number | null>

  /**
   * 依玩家 ID 刪除所有每日積分
   *
   * @param playerId - 玩家 ID
   */
  deleteByPlayerId(playerId: string): Promise<void>
}
