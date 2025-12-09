/**
 * POST /api/v1/games/{gameId}/leave - Framework Layer
 *
 * @description
 * 玩家離開遊戲 API 端點。
 * 驗證會話，調用 LeaveGameUseCase。
 * 當玩家離開時，對手獲勝，遊戲立即結束。
 *
 * 參考: specs/008-nuxt-backend-server/contracts/rest-api.md
 */

import { LeaveGameError } from '~~/server/application/ports/input/leaveGameInputPort'
import { container } from '~~/server/utils/container'
import {
  validateSession,
  SessionValidationError,
  createSessionErrorResponse,
  clearSessionCookie,
} from '~~/server/utils/sessionValidation'
import { createLogger } from '~~/server/utils/logger'
import { initRequestId } from '~~/server/utils/requestId'

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
interface LeaveResponse {
  data: {
    game_id: string
    left_at: string
  }
  timestamp: string
}

export default defineEventHandler(async (event): Promise<LeaveResponse | ErrorResponse> => {
  const requestId = initRequestId(event)
  const logger = createLogger('API:leave', requestId)

  try {
    // 1. 取得遊戲 ID
    const gameId = getRouterParam(event, 'gameId')
    if (!gameId) {
      logger.warn('Missing game ID')
      setResponseStatus(event, 400)
      return {
        error: {
          code: 'MISSING_GAME_ID',
          message: 'Game ID is required',
        },
        timestamp: new Date().toISOString(),
      }
    }

    // 2. 驗證會話
    let sessionContext
    try {
      sessionContext = validateSession(event, gameId)
    } catch (err) {
      if (err instanceof SessionValidationError) {
        logger.warn('Session validation failed', { code: err.code, gameId })
        setResponseStatus(event, err.statusCode)
        return createSessionErrorResponse(err)
      }
      throw err
    }

    logger.info('Processing leave request', { gameId, playerId: sessionContext.playerId })

    // 3. 從容器取得 UseCase
    const useCase = container.leaveGameUseCase

    // 4. 執行用例
    const result = await useCase.execute({
      gameId,
      playerId: sessionContext.playerId,
    })

    // 5. 清除 Session Cookie
    clearSessionCookie(event)
    logger.info('Session cookie cleared', { gameId })

    // 6. 返回成功回應
    logger.info('Leave request completed', { gameId })
    setResponseStatus(event, 200)
    return {
      data: {
        game_id: gameId,
        left_at: result.leftAt,
      },
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    // 處理 UseCase 錯誤
    if (error instanceof LeaveGameError) {
      logger.warn('Leave game error', { code: error.code, message: error.message })
      const statusCode =
        error.code === 'GAME_NOT_FOUND'
          ? 404
          : error.code === 'GAME_ALREADY_FINISHED'
            ? 409
            : 403
      setResponseStatus(event, statusCode)
      return {
        error: {
          code: error.code,
          message: error.message,
        },
        timestamp: new Date().toISOString(),
      }
    }

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
