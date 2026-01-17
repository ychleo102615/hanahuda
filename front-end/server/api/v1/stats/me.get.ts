/**
 * GET /api/v1/stats/me - Personal Statistics API
 *
 * @description
 * 取得當前登入玩家的個人統計資料。
 *
 * Query Parameters:
 * - timeRange: 'all' | 'day' | 'week' | 'month' (optional, default: 'all')
 *
 * @module server/api/v1/stats/me
 */

import { getQuery, createError } from 'h3'
import { db } from '~~/server/utils/db'
import { getLeaderboardContainer } from '~~/server/leaderboard/adapters/di/container'
import { getIdentityPortAdapter } from '~~/server/core-game/adapters/identity/identityPortAdapter'
import { isValidTimeRange } from '~~/server/leaderboard/domain/statistics/time-range'
import { createEmptyStatistics } from '~~/server/leaderboard/domain/statistics/player-statistics'
import type { PlayerStatistics } from '~~/server/leaderboard/domain/statistics/player-statistics'
import type { TimeRange } from '~~/server/leaderboard/domain/statistics/time-range'

/**
 * 個人統計 API 回應
 */
interface PersonalStatsApiResponse {
  data: {
    /** 玩家統計 */
    statistics: PlayerStatistics
    /** 時間範圍 */
    timeRange: TimeRange
  }
  timestamp: string
}

/**
 * 預設時間範圍
 */
const DEFAULT_TIME_RANGE: TimeRange = 'all'

export default defineEventHandler(async (event): Promise<PersonalStatsApiResponse> => {
  // 取得玩家 ID（可能為 null）
  const identityPort = getIdentityPortAdapter()
  const playerId = await identityPort.getPlayerIdFromRequest(event)

  // 參數驗證
  const query = getQuery(event)
  const timeRangeParam = query.timeRange as string | undefined

  let timeRange: TimeRange = DEFAULT_TIME_RANGE
  if (timeRangeParam !== undefined) {
    if (!isValidTimeRange(timeRangeParam)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: `Invalid timeRange parameter. Must be 'all', 'day', 'week', or 'month', got: ${timeRangeParam}`,
      })
    }
    timeRange = timeRangeParam
  }

  // 如果沒有 playerId，返回空統計
  if (!playerId) {
    return {
      data: {
        statistics: createEmptyStatistics(''),
        timeRange,
      },
      timestamp: new Date().toISOString(),
    }
  }

  // 取得玩家統計
  const container = getLeaderboardContainer(db)
  const result = await container.getPlayerStatisticsUseCase.execute({
    playerId,
    timeRange,
  })

  return {
    data: {
      statistics: result.statistics,
      timeRange: result.timeRange,
    },
    timestamp: new Date().toISOString(),
  }
})
