/**
 * GET /api/v1/leaderboard - Leaderboard API
 *
 * @description
 * 取得日榜或週榜排行榜資料。
 *
 * Query Parameters:
 * - type: 'daily' | 'weekly' (required)
 * - limit: 1-100 (optional, default: 10)
 *
 * @module server/api/v1/leaderboard
 */

import { getQuery, createError } from 'h3'
import { db } from '~~/server/utils/db'
import { getLeaderboardContainer } from '~~/server/leaderboard/adapters/di/container'
import { isValidLeaderboardType } from '~~/server/leaderboard/domain/leaderboard/leaderboard-type'
import { getIdentityPortAdapter } from '~~/server/core-game/adapters/identity/identityPortAdapter'
import type { LeaderboardEntry } from '~~/server/leaderboard/domain/leaderboard/leaderboard-entry'
import type { LeaderboardType } from '~~/server/leaderboard/domain/leaderboard/leaderboard-type'

/**
 * 排行榜 API 回應
 */
interface LeaderboardApiResponse {
  data: {
    /** 排行榜條目 */
    entries: LeaderboardEntry[]
    /** 排行榜類型 */
    type: LeaderboardType
    /** 當前玩家排名（若有登入且不在榜內） */
    currentPlayerRank?: number
  }
  timestamp: string
}

/**
 * 最小限制數量
 */
const MIN_LIMIT = 1

/**
 * 最大限制數量
 */
const MAX_LIMIT = 100

/**
 * 預設限制數量
 */
const DEFAULT_LIMIT = 10

export default defineEventHandler(async (event): Promise<LeaderboardApiResponse> => {
  const query = getQuery(event)

  // T046: 參數驗證
  const type = query.type as string | undefined
  const limitParam = query.limit as string | undefined

  // 驗證 type 參數
  if (!type) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Missing required parameter: type',
    })
  }

  if (!isValidLeaderboardType(type)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: `Invalid type parameter. Must be 'daily' or 'weekly', got: ${type}`,
    })
  }

  // 驗證 limit 參數
  let limit = DEFAULT_LIMIT
  if (limitParam !== undefined) {
    const parsedLimit = Number.parseInt(limitParam, 10)

    if (Number.isNaN(parsedLimit)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: `Invalid limit parameter. Must be a number, got: ${limitParam}`,
      })
    }

    if (parsedLimit < MIN_LIMIT || parsedLimit > MAX_LIMIT) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: `Invalid limit parameter. Must be between ${MIN_LIMIT} and ${MAX_LIMIT}, got: ${parsedLimit}`,
      })
    }

    limit = parsedLimit
  }

  // 取得當前玩家 ID（若有登入）
  const identityPort = getIdentityPortAdapter()
  const currentPlayerId = await identityPort.getPlayerIdFromRequest(event)

  // 取得 Leaderboard 容器
  const container = getLeaderboardContainer(db)

  // 根據類型選擇 Use Case
  const useCase = type === 'daily'
    ? container.getDailyLeaderboardUseCase
    : container.getWeeklyLeaderboardUseCase

  // 執行查詢
  const result = await useCase.execute({
    type,
    limit,
    currentPlayerId: currentPlayerId ?? undefined,
  })

  return {
    data: {
      entries: result.entries,
      type: result.type,
      currentPlayerRank: result.currentPlayerRank,
    },
    timestamp: new Date().toISOString(),
  }
})
