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

import { LeaveGameError, type LeaveGameInputPort } from '~~/server/core-game/application/ports/input/leaveGameInputPort'
import { resolve, BACKEND_TOKENS } from '~~/server/utils/container'
import {
  validateSession,
  SessionValidationError,
  createSessionErrorResponse,
  clearSessionCookie,
} from '~~/server/utils/sessionValidation'
import {
  HTTP_OK,
  HTTP_BAD_REQUEST,
  HTTP_FORBIDDEN,
  HTTP_NOT_FOUND,
  HTTP_CONFLICT,
  HTTP_INTERNAL_SERVER_ERROR,
} from '#shared/constants'

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
  try {
    // 1. 取得遊戲 ID
    const gameId = getRouterParam(event, 'gameId')
    if (!gameId) {
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
        setResponseStatus(event, err.statusCode)
        return createSessionErrorResponse(err)
      }
      throw err
    }

    // 3. 從容器取得 UseCase
    const useCase = resolve<LeaveGameInputPort>(BACKEND_TOKENS.LeaveGameInputPort)

    // 4. 執行用例
    const result = await useCase.execute({
      gameId,
      playerId: sessionContext.playerId,
    })

    // 5. 清除 Session Cookie
    clearSessionCookie(event)

    // 6. 返回成功回應
    setResponseStatus(event, HTTP_OK)
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
      const statusCode =
        error.code === 'GAME_NOT_FOUND'
          ? HTTP_NOT_FOUND
          : error.code === 'GAME_ALREADY_FINISHED'
            ? HTTP_CONFLICT
            : HTTP_FORBIDDEN
      setResponseStatus(event, statusCode)
      return {
        error: {
          code: error.code,
          message: error.message,
        },
        timestamp: new Date().toISOString(),
      }
    }

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
