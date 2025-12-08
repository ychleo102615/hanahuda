/**
 * POST /api/v1/games/{gameId}/turns/play-card - Framework Layer
 *
 * @description
 * 打出手牌 API 端點。
 * 驗證會話，調用 PlayHandCardUseCase。
 *
 * 參考: specs/008-nuxt-backend-server/contracts/rest-api.md
 */

import { z } from 'zod'
import { PlayHandCardError } from '~~/server/application/ports/input/playHandCardInputPort'
import { container } from '~~/server/utils/container'
import {
  validateSession,
  SessionValidationError,
  createSessionErrorResponse,
} from '~~/server/utils/sessionValidation'
import { createLogger } from '~~/server/utils/logger'
import { initRequestId } from '~~/server/utils/requestId'

/**
 * 請求 Body Schema
 */
const PlayCardRequestSchema = z.object({
  card_id: z.string().min(1, 'card_id is required'),
  target_card_id: z.string().optional(),
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
interface PlayCardResponse {
  data: {
    accepted: true
  }
  timestamp: string
}

export default defineEventHandler(async (event): Promise<PlayCardResponse | ErrorResponse> => {
  const requestId = initRequestId(event)
  const logger = createLogger('API:play-card', requestId)

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

    // 3. 解析並驗證請求 Body
    const body = await readBody(event)
    const parseResult = PlayCardRequestSchema.safeParse(body)

    if (!parseResult.success) {
      logger.warn('Validation failed', { errors: parseResult.error.flatten().fieldErrors })
      setResponseStatus(event, 400)
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: parseResult.error.flatten().fieldErrors as Record<string, string[]>,
        },
        timestamp: new Date().toISOString(),
      }
    }

    const { card_id, target_card_id } = parseResult.data
    logger.info('Processing play-card request', { gameId, playerId: sessionContext.playerId, cardId: card_id, targetCardId: target_card_id })

    // 4. 從容器取得 UseCase
    const useCase = container.playHandCardUseCase

    // 5. 執行用例
    await useCase.execute({
      gameId,
      playerId: sessionContext.playerId,
      cardId: card_id,
      targetCardId: target_card_id,
    })

    // 6. 返回成功回應
    logger.info('Play-card request completed', { gameId })
    setResponseStatus(event, 200)
    return {
      data: {
        accepted: true,
      },
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    // 處理 UseCase 錯誤
    if (error instanceof PlayHandCardError) {
      logger.warn('Play card error', { code: error.code, message: error.message })
      const statusCode = error.code === 'GAME_NOT_FOUND' ? 404 : 409
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
