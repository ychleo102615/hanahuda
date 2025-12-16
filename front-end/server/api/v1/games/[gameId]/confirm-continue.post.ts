/**
 * POST /api/v1/games/{gameId}/confirm-continue - Framework Layer
 *
 * @description
 * 玩家確認繼續遊戲 API 端點。
 * 當玩家閒置超過 60 秒後，回合結束時需要確認繼續遊戲。
 * 若玩家在 7 秒內未確認，則視為放棄，踢出遊戲。
 *
 * 參考: specs/008-nuxt-backend-server/contracts/rest-api.md
 */

import { ConfirmContinueError } from '~~/server/application/ports/input/confirmContinueInputPort'
import { container } from '~~/server/utils/container'
import {
  validateSession,
  SessionValidationError,
  createSessionErrorResponse,
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
interface ConfirmContinueResponse {
  data: {
    game_id: string
    confirmed_at: string
  }
  timestamp: string
}

export default defineEventHandler(async (event): Promise<ConfirmContinueResponse | ErrorResponse> => {
  const requestId = initRequestId(event)
  const logger = createLogger('API:confirm-continue', requestId)

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

    logger.info('Processing confirm continue request', { gameId, playerId: sessionContext.playerId })

    // 3. 從容器取得 UseCase
    const useCase = container.confirmContinueUseCase

    // 4. 執行用例
    const result = await useCase.execute({
      gameId,
      playerId: sessionContext.playerId,
    })

    // 5. 返回成功回應
    logger.info('Confirm continue request completed', { gameId })
    setResponseStatus(event, 200)
    return {
      data: {
        game_id: gameId,
        confirmed_at: result.confirmedAt,
      },
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    // 處理 UseCase 錯誤
    if (error instanceof ConfirmContinueError) {
      logger.warn('Confirm continue error', { code: error.code, message: error.message })
      const statusCode =
        error.code === 'GAME_NOT_FOUND'
          ? 404
          : error.code === 'GAME_ALREADY_FINISHED'
            ? 409
            : error.code === 'CONFIRMATION_NOT_REQUIRED'
              ? 400
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
