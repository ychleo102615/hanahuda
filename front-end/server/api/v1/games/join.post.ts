/**
 * POST /api/v1/games/join - Framework Layer
 *
 * @description
 * 加入遊戲 API 端點。
 * 組裝依賴，調用 JoinGameUseCase。
 *
 * 參考: specs/008-nuxt-backend-server/contracts/rest-api.md#POST-apiv1gamesjoin
 */

import { z } from 'zod'
import { container } from '~~/server/utils/container'

/**
 * 請求 Body Schema
 */
const JoinGameRequestSchema = z.object({
  player_id: z.string().uuid('player_id must be a valid UUID'),
  player_name: z.string().min(1, 'player_name is required').max(50, 'player_name must be at most 50 characters'),
  session_token: z.string().uuid('session_token must be a valid UUID').optional(),
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
interface JoinGameResponse {
  data: {
    game_id: string
    session_token: string
    player_id: string
    sse_endpoint: string
  }
  timestamp: string
}

export default defineEventHandler(async (event): Promise<JoinGameResponse | ErrorResponse> => {
  try {
    // 1. 解析並驗證請求 Body
    const body = await readBody(event)
    const parseResult = JoinGameRequestSchema.safeParse(body)

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

    const { player_id, player_name, session_token } = parseResult.data

    // 2. 從容器取得 JoinGameUseCase
    const useCase = container.joinGameUseCase

    // 3. 執行用例
    const result = await useCase.execute({
      playerId: player_id,
      playerName: player_name,
      sessionToken: session_token,
    })

    // 4. 設定回應狀態碼
    // 201 Created: 新遊戲建立（WAITING 或 IN_PROGRESS）
    // 200 OK: 重連現有遊戲
    setResponseStatus(event, result.reconnected ? 200 : 201)

    // 5. 返回回應
    return {
      data: {
        game_id: result.gameId,
        session_token: result.sessionToken,
        player_id: result.playerId,
        sse_endpoint: result.sseEndpoint,
      },
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    console.error('[POST /api/v1/games/join] Error:', error)

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
