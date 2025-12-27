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
import { setSessionCookie } from '~~/server/utils/sessionValidation'
import {
  HTTP_OK,
  HTTP_CREATED,
  HTTP_BAD_REQUEST,
  HTTP_INTERNAL_SERVER_ERROR,
} from '#shared/constants'

/**
 * 請求 Body Schema
 */
const JoinGameRequestSchema = z.object({
  player_id: z.string().uuid('player_id must be a valid UUID'),
  player_name: z.string().min(1, 'player_name is required').max(50, 'player_name must be at most 50 characters'),
  session_token: z.string().uuid('session_token must be a valid UUID').optional(),
  game_id: z.string().uuid('game_id must be a valid UUID').optional(),
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
 *
 * @note session_token 不再包含在回應中，改為透過 HttpOnly Cookie 傳送
 */
interface JoinGameSuccessResponse {
  data: {
    game_id: string
    player_id: string
    sse_endpoint: string
  }
  timestamp: string
}

/**
 * 遊戲已結束回應型別
 */
interface JoinGameFinishedResponse {
  data: {
    status: 'game_finished'
    game_id: string
    winner_id: string | null
    final_scores: Array<{ player_id: string; score: number }>
    rounds_played: number
    total_rounds: number
  }
  timestamp: string
}

/**
 * 遊戲已過期回應型別
 */
interface JoinGameExpiredResponse {
  data: {
    status: 'game_expired'
    game_id: string
  }
  timestamp: string
}

type JoinGameResponse = JoinGameSuccessResponse | JoinGameFinishedResponse | JoinGameExpiredResponse

export default defineEventHandler(async (event): Promise<JoinGameResponse | ErrorResponse> => {
  try {
    // 1. 解析並驗證請求 Body
    const body = await readBody(event)
    const parseResult = JoinGameRequestSchema.safeParse(body)

    if (!parseResult.success) {
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

    const { player_id, player_name, session_token: bodySessionToken, game_id } = parseResult.data

    // 2. 從 Cookie 讀取 session_token（優先使用 Cookie，因為 HttpOnly Cookie 更安全）
    const cookieSessionToken = getCookie(event, 'session_token')
    const sessionToken = cookieSessionToken || bodySessionToken

    // 3. 從容器取得 JoinGameUseCase
    const useCase = container.joinGameUseCase

    // 4. 執行用例
    const result = await useCase.execute({
      playerId: player_id,
      playerName: player_name,
      sessionToken,
      gameId: game_id,
    })

    // 5. 根據結果類型處理回應
    // 注意：此端點為過渡期支援，新架構請使用 GET /api/v1/games/connect
    switch (result.status) {
      // SSE-First 新狀態（將 game_waiting 和 game_started 映射到舊格式）
      case 'game_waiting':
      case 'game_started':
      case 'snapshot': {
        // 設定 HttpOnly Cookie 存放 session_token
        setSessionCookie(event, result.sessionToken)

        setResponseStatus(event, HTTP_CREATED)
        return {
          data: {
            game_id: result.gameId,
            player_id: result.playerId,
            sse_endpoint: `/api/v1/games/connect?player_id=${result.playerId}&player_name=Player&game_id=${result.gameId}`,
          },
          timestamp: new Date().toISOString(),
        }
      }

      case 'success': {
        // 5a. 舊版成功加入/重連遊戲（向後兼容）
        // 設定 HttpOnly Cookie 存放 session_token
        setSessionCookie(event, result.sessionToken)

        // 設定回應狀態碼
        // 201 Created: 新遊戲建立（WAITING 或 IN_PROGRESS）
        // 200 OK: 重連現有遊戲
        setResponseStatus(event, result.reconnected ? HTTP_OK : HTTP_CREATED)

        return {
          data: {
            game_id: result.gameId,
            player_id: result.playerId,
            sse_endpoint: result.sseEndpoint,
          },
          timestamp: new Date().toISOString(),
        }
      }

      case 'game_finished': {
        // 5b. 遊戲已結束（從 DB 查到）
        setResponseStatus(event, HTTP_OK)
        return {
          data: {
            status: 'game_finished',
            game_id: result.gameId,
            winner_id: result.winnerId,
            final_scores: result.finalScores.map((s) => ({
              player_id: s.playerId,
              score: s.score,
            })),
            rounds_played: result.roundsPlayed,
            total_rounds: result.totalRounds,
          },
          timestamp: new Date().toISOString(),
        }
      }

      case 'game_expired': {
        // 5c. 遊戲已過期（在 DB 但不在記憶體）
        setResponseStatus(event, HTTP_OK)
        return {
          data: {
            status: 'game_expired',
            game_id: result.gameId,
          },
          timestamp: new Date().toISOString(),
        }
      }

      default: {
        // 確保窮舉檢查
        const _exhaustiveCheck: never = result
        throw new Error(`Unexpected status: ${(_exhaustiveCheck as { status: string }).status}`)
      }
    }
  } catch {
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
