/**
 * GET /api/v1/games/:gameId/snapshot - Framework Layer
 *
 * @description
 * 取得遊戲快照 API 端點。
 * 用於斷線重連時，客戶端可主動請求完整遊戲狀態。
 *
 * 參考: specs/008-nuxt-backend-server/contracts/rest-api.md
 */

import { z } from 'zod'
import { container } from '~~/server/utils/container'
import type { GameSnapshotRestore } from '#shared/contracts'
import { createLogger } from '~~/server/utils/logger'
import { initRequestId } from '~~/server/utils/requestId'

/**
 * 請求參數 Schema
 */
const RequestParamsSchema = z.object({
  gameId: z.string().uuid('gameId must be a valid UUID'),
})


/**
 * 錯誤回應型別
 */
interface ErrorResponse {
  error: {
    code: string
    message: string
  }
  timestamp: string
}

/**
 * 成功回應型別
 */
interface SnapshotResponse {
  data: GameSnapshotRestore
  timestamp: string
}

export default defineEventHandler(async (event): Promise<SnapshotResponse | ErrorResponse> => {
  const requestId = initRequestId(event)
  const logger = createLogger('API:snapshot', requestId)

  try {
    // 1. 解析並驗證路由參數
    const params = getRouterParams(event)
    const paramsResult = RequestParamsSchema.safeParse(params)

    if (!paramsResult.success) {
      logger.warn('Invalid gameId parameter')
      setResponseStatus(event, 400)
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid gameId parameter',
        },
        timestamp: new Date().toISOString(),
      }
    }

    const { gameId } = paramsResult.data

    // 2. 從 Cookie 讀取 session_token（HttpOnly Cookie 由瀏覽器自動傳送）
    const sessionToken = getCookie(event, 'session_token')

    if (!sessionToken) {
      logger.warn('Missing session token cookie', { gameId })
      setResponseStatus(event, 401)
      return {
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid session token',
        },
        timestamp: new Date().toISOString(),
      }
    }

    logger.info('Processing snapshot request', { gameId })

    // 3. 從 gameStore 取得遊戲（驗證 session token）
    const game = container.gameStore.getBySessionToken(sessionToken!)
    if (!game) {
      logger.warn('Invalid or expired session token', { gameId })
      setResponseStatus(event, 401)
      return {
        error: {
          code: 'SESSION_INVALID',
          message: 'Session token is invalid or expired',
        },
        timestamp: new Date().toISOString(),
      }
    }

    // 4. 驗證 gameId 匹配
    if (game.id !== gameId) {
      logger.warn('Game ID mismatch', { requestedGameId: gameId, actualGameId: game.id })
      setResponseStatus(event, 404)
      return {
        error: {
          code: 'GAME_NOT_FOUND',
          message: 'Game not found',
        },
        timestamp: new Date().toISOString(),
      }
    }

    // 5. 檢查遊戲狀態
    if (game.status === 'FINISHED') {
      logger.warn('Game already finished', { gameId })
      setResponseStatus(event, 410)
      return {
        error: {
          code: 'GAME_FINISHED',
          message: 'Game has already finished',
        },
        timestamp: new Date().toISOString(),
      }
    }

    // 6. 若遊戲為 WAITING 狀態（尚未開始），無法建立快照
    if (game.status === 'WAITING') {
      logger.warn('Game not started yet', { gameId })
      setResponseStatus(event, 409)
      return {
        error: {
          code: 'GAME_NOT_STARTED',
          message: 'Game has not started yet',
        },
        timestamp: new Date().toISOString(),
      }
    }

    // 7. 建立並回傳快照
    const snapshotEvent = container.eventMapper.toGameSnapshotRestoreEvent(game)

    logger.info('Snapshot request completed', { gameId })
    setResponseStatus(event, 200)
    return {
      data: snapshotEvent,
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    logger.error('Unexpected error', error)

    setResponseStatus(event, 500)
    return {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
      timestamp: new Date().toISOString(),
    }
  }
})
