/**
 * GetPlayerStatisticsInputPort
 *
 * @description
 * 取得玩家統計的 Input Port 介面。
 *
 * @module server/leaderboard/application/ports/input/get-player-statistics-input-port
 */

import type { PlayerStatistics } from '~~/server/leaderboard/domain/statistics/player-statistics'
import type { TimeRange } from '~~/server/leaderboard/domain/statistics/time-range'

/**
 * 取得玩家統計請求
 */
export interface GetPlayerStatisticsRequest {
  /** 玩家 ID */
  readonly playerId: string
  /** 時間範圍（可選，預設為 'all'） */
  readonly timeRange?: TimeRange
}

/**
 * 取得玩家統計回應
 */
export interface GetPlayerStatisticsResponse {
  /** 玩家統計資料 */
  readonly statistics: PlayerStatistics
  /** 時間範圍 */
  readonly timeRange: TimeRange
}

/**
 * 取得玩家統計 Input Port
 */
export interface GetPlayerStatisticsInputPort {
  /**
   * 執行取得玩家統計
   *
   * @param request - 請求參數
   * @returns 玩家統計回應
   */
  execute(request: GetPlayerStatisticsRequest): Promise<GetPlayerStatisticsResponse>
}
