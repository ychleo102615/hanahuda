/**
 * POST /api/v1/games/{gameId}/rounds/decision - Framework Layer
 *
 * @description
 * Koi-Koi 決策 API 端點。
 * 驗證會話，調用 MakeDecisionUseCase。
 *
 * 參考: specs/008-nuxt-backend-server/contracts/rest-api.md
 */

import { z } from 'zod'
import { MakeDecisionError } from '~~/server/application/ports/input/makeDecisionInputPort'
import { container } from '~~/server/utils/container'
import {
  validateSession,
  SessionValidationError,
  createSessionErrorResponse,
} from '~~/server/utils/sessionValidation'
import { createLogger } from '~~/server/utils/logger'
import { initRequestId } from '~~/server/utils/requestId'
import {
  HTTP_OK,
  HTTP_BAD_REQUEST,
  HTTP_NOT_FOUND,
  HTTP_CONFLICT,
  HTTP_INTERNAL_SERVER_ERROR,
} from '#shared/constants'

/**
 * 請求 Body Schema
 */
const DecisionRequestSchema = z.object({
  decision: z.enum(['KOI_KOI', 'END_ROUND'], 'decision must be either KOI_KOI or END_ROUND'),
})

/**
 * 錯誤回應型別
 */
interface ErrorResponse {
  error: {
    code: string
    message: string
    details?: Record<string, string[]>
  }
  timestamp: string
}

/**
 * 成功回應型別
 */
interface DecisionResponse {
  data: {
    accepted: true
  }
  timestamp: string
}

export default defineEventHandler(async (event): Promise<DecisionResponse | ErrorResponse> => {
  const requestId = initRequestId(event)
  const logger = createLogger('API:decision', requestId)

  try {
    // 1. 取得遊戲 ID
    const gameId = getRouterParam(event, 'gameId')
    if (!gameId) {
      logger.warn('Missing game ID')
      setResponseStatus(event, HTTP_BAD_REQUEST)
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

    // 3. 解析並驗證請求 Body
    const body = await readBody(event)
    const parseResult = DecisionRequestSchema.safeParse(body)

    if (!parseResult.success) {
      logger.warn('Validation failed', { errors: parseResult.error.flatten().fieldErrors })
      setResponseStatus(event, HTTP_BAD_REQUEST)
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: parseResult.error.flatten().fieldErrors as Record<string, string[]>,
        },
        timestamp: new Date().toISOString(),
      }
    }

    const { decision } = parseResult.data
    logger.info('Processing decision request', { gameId, playerId: sessionContext.playerId, decision })

    // 4. 從容器取得 UseCase
    const useCase = container.makeDecisionUseCase

    // 5. 執行用例
    await useCase.execute({
      gameId,
      playerId: sessionContext.playerId,
      decision,
    })

    // 6. 返回成功回應
    logger.info('Decision request completed', { gameId, decision })
    setResponseStatus(event, HTTP_OK)
    return {
      data: {
        accepted: true,
      },
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    // 處理 UseCase 錯誤
    if (error instanceof MakeDecisionError) {
      logger.warn('Make decision error', { code: error.code, message: error.message })
      const statusCode = error.code === 'GAME_NOT_FOUND' ? HTTP_NOT_FOUND : HTTP_CONFLICT
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
    setResponseStatus(event, HTTP_INTERNAL_SERVER_ERROR)
    return {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
      timestamp: new Date().toISOString(),
    }
  }
})
