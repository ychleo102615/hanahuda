/**
 * POST /api/v1/games/{gameId}/turns/select-target - Framework Layer
 *
 * @description
 * 選擇配對目標 API 端點（雙重配對時使用）。
 * 驗證會話，調用 SelectTargetUseCase。
 *
 * 參考: specs/008-nuxt-backend-server/contracts/rest-api.md
 */

import { z } from 'zod'
import { SelectTargetUseCase, SelectTargetError } from '~~/server/application/use-cases/selectTargetUseCase'
import { gameRepository } from '~~/server/adapters/persistence/drizzleGameRepository'
import { sseEventPublisher } from '~~/server/adapters/event-publisher/sseEventPublisher'
import { inMemoryGameStore } from '~~/server/adapters/persistence/inMemoryGameStore'
import { eventMapper } from '~~/server/adapters/mappers/eventMapper'
import {
  validateSession,
  SessionValidationError,
  createSessionErrorResponse,
} from '~~/server/utils/sessionValidation'

/**
 * 請求 Body Schema
 */
const SelectTargetRequestSchema = z.object({
  source_card_id: z.string().min(1, 'source_card_id is required'),
  target_card_id: z.string().min(1, 'target_card_id is required'),
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
interface SelectTargetResponse {
  data: {
    accepted: true
  }
  timestamp: string
}

export default defineEventHandler(async (event): Promise<SelectTargetResponse | ErrorResponse> => {
  try {
    // 1. 取得遊戲 ID
    const gameId = getRouterParam(event, 'gameId')
    if (!gameId) {
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
        setResponseStatus(event, err.statusCode)
        return createSessionErrorResponse(err)
      }
      throw err
    }

    // 3. 解析並驗證請求 Body
    const body = await readBody(event)
    const parseResult = SelectTargetRequestSchema.safeParse(body)

    if (!parseResult.success) {
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

    const { source_card_id, target_card_id } = parseResult.data

    // 4. 建立 UseCase 並注入依賴
    const useCase = new SelectTargetUseCase(
      gameRepository,
      sseEventPublisher,
      inMemoryGameStore,
      eventMapper
    )

    // 5. 執行用例
    await useCase.execute({
      gameId,
      playerId: sessionContext.playerId,
      sourceCardId: source_card_id,
      targetCardId: target_card_id,
    })

    // 6. 返回成功回應
    setResponseStatus(event, 200)
    return {
      data: {
        accepted: true,
      },
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    console.error('[POST /api/v1/games/{gameId}/turns/select-target] Error:', error)

    // 處理 UseCase 錯誤
    if (error instanceof SelectTargetError) {
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
