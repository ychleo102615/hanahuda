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

import { ConfirmContinueError, type ConfirmContinueInputPort } from '~~/server/application/ports/input/confirmContinueInputPort'
import { resolve, BACKEND_TOKENS } from '~~/server/utils/container'
import {
  validateSession,
  SessionValidationError,
  createSessionErrorResponse,
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
interface ConfirmContinueResponse {
  data: {
    game_id: string
    confirmed_at: string
  }
  timestamp: string
}

export default defineEventHandler(async (event): Promise<ConfirmContinueResponse | ErrorResponse> => {
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

    // 3. 解析請求 Body
    const body = await readBody(event)
    const decision = body?.decision as 'CONTINUE' | 'LEAVE' | undefined

    // 驗證 decision
    if (!decision || (decision !== 'CONTINUE' && decision !== 'LEAVE')) {
      setResponseStatus(event, HTTP_BAD_REQUEST)
      return {
        error: {
          code: 'INVALID_DECISION',
          message: 'Decision must be either CONTINUE or LEAVE',
        },
        timestamp: new Date().toISOString(),
      }
    }

    // 4. 從容器取得 UseCase
    const useCase = resolve<ConfirmContinueInputPort>(BACKEND_TOKENS.ConfirmContinueInputPort)

    // 5. 執行用例
    const result = await useCase.execute({
      gameId,
      playerId: sessionContext.playerId,
      decision,
    })

    // 6. 返回成功回應
    setResponseStatus(event, HTTP_OK)
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
      const statusCode =
        error.code === 'GAME_NOT_FOUND'
          ? HTTP_NOT_FOUND
          : error.code === 'GAME_ALREADY_FINISHED'
            ? HTTP_CONFLICT
            : error.code === 'CONFIRMATION_NOT_REQUIRED'
              ? HTTP_BAD_REQUEST
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
