/**
 * GET /api/v1/games/:gameId/snapshot - Framework Layer
 *
 * @description
 * 取得遊戲快照 API 端點。
 * 用於斷線重連時，客戶端可主動請求完整遊戲狀態。
 *
 * 回應類型：
 * - `snapshot`: 正常遊戲快照（記憶體中有進行中的遊戲）
 * - `game_finished`: 遊戲已結束（從資料庫恢復結果）
 * - `game_expired`: 遊戲已過期無法恢復
 *
 * 參考: specs/008-nuxt-backend-server/contracts/rest-api.md
 */

import { z } from 'zod'
import { resolve, BACKEND_TOKENS } from '~~/server/utils/container'
import type { GameStorePort } from '~~/server/core-game/application/ports/output/gameStorePort'
import type { GameTimeoutPort } from '~~/server/core-game/application/ports/output/gameTimeoutPort'
import type { FullEventMapperPort } from '~~/server/core-game/application/ports/output/eventMapperPort'
import type { GameRepositoryPort } from '~~/server/core-game/application/ports/output/gameRepositoryPort'
import type { SnapshotApiResponse } from '#shared/contracts'
import { determineWinner } from '~~/server/core-game/domain/game'
import {
  HTTP_OK,
  HTTP_BAD_REQUEST,
  HTTP_UNAUTHORIZED,
  HTTP_NOT_FOUND,
  HTTP_CONFLICT,
  HTTP_INTERNAL_SERVER_ERROR,
} from '#shared/constants'

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
 * 成功回應型別（含 timestamp wrapper）
 */
interface SnapshotResponseWrapper {
  data: SnapshotApiResponse
  timestamp: string
}

export default defineEventHandler(async (event): Promise<SnapshotResponseWrapper | ErrorResponse> => {
  try {
    // 1. 解析並驗證路由參數
    const params = getRouterParams(event)
    const paramsResult = RequestParamsSchema.safeParse(params)

    if (!paramsResult.success) {
      setResponseStatus(event, HTTP_BAD_REQUEST)
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
      setResponseStatus(event, HTTP_UNAUTHORIZED)
      return {
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid session token',
        },
        timestamp: new Date().toISOString(),
      }
    }

    // 3. 嘗試從 gameStore（記憶體）取得遊戲
    const gameStore = resolve<GameStorePort>(BACKEND_TOKENS.GameStore)
    const game = gameStore.getBySessionToken(sessionToken!)

    // 4. 如果記憶體有遊戲 → 正常流程
    if (game) {
      // 4.1. 驗證 gameId 匹配
      if (game.id !== gameId) {
        setResponseStatus(event, HTTP_NOT_FOUND)
        return {
          error: {
            code: 'GAME_NOT_FOUND',
            message: 'Game not found',
          },
          timestamp: new Date().toISOString(),
        }
      }

      // 4.2. 檢查遊戲狀態 - FINISHED
      if (game.status === 'FINISHED') {
        setResponseStatus(event, HTTP_OK)
        return {
          data: {
            response_type: 'game_finished',
            data: {
              game_id: game.id,
              winner_id: determineWinner(game),
              final_scores: [...game.cumulativeScores],
              rounds_played: game.roundsPlayed,
              total_rounds: game.totalRounds,
            },
          },
          timestamp: new Date().toISOString(),
        }
      }

      // 4.3. 檢查遊戲狀態 - WAITING
      if (game.status === 'WAITING') {
        setResponseStatus(event, HTTP_CONFLICT)
        return {
          error: {
            code: 'GAME_NOT_STARTED',
            message: 'Game has not started yet',
          },
          timestamp: new Date().toISOString(),
        }
      }

      // 4.4. 正常進行中的遊戲 → 返回快照
      const gameTimeoutManager = resolve<GameTimeoutPort>(BACKEND_TOKENS.GameTimeoutManager)
      const eventMapper = resolve<FullEventMapperPort>(BACKEND_TOKENS.EventMapper)
      const remainingSeconds = gameTimeoutManager.getRemainingSeconds(gameId)
      const snapshotEvent = eventMapper.toGameSnapshotRestoreEvent(
        game,
        remainingSeconds ?? undefined
      )

      setResponseStatus(event, HTTP_OK)
      return {
        data: {
          response_type: 'snapshot',
          data: snapshotEvent,
        },
        timestamp: new Date().toISOString(),
      }
    }

    // 5. 記憶體沒有遊戲 → 查詢資料庫
    const gameRepository = resolve<GameRepositoryPort>(BACKEND_TOKENS.GameRepository)
    const dbGame = await gameRepository.findById(gameId)

    if (!dbGame) {
      // 5.1. 資料庫也沒有 → 404
      setResponseStatus(event, HTTP_NOT_FOUND)
      return {
        error: {
          code: 'GAME_NOT_FOUND',
          message: 'Game not found',
        },
        timestamp: new Date().toISOString(),
      }
    }

    // 5.2. 資料庫有遊戲且已結束 → 返回遊戲結果
    if (dbGame.status === 'FINISHED') {
      setResponseStatus(event, HTTP_OK)
      return {
        data: {
          response_type: 'game_finished',
          data: {
            game_id: dbGame.id,
            winner_id: determineWinner(dbGame),
            final_scores: [...dbGame.cumulativeScores],
            rounds_played: dbGame.roundsPlayed,
            total_rounds: dbGame.totalRounds,
          },
        },
        timestamp: new Date().toISOString(),
      }
    }

    // 5.3. 資料庫有遊戲但未結束 → 遊戲已過期（無法恢復完整狀態）
    setResponseStatus(event, HTTP_OK)
    return {
      data: {
        response_type: 'game_expired',
        data: null,
      },
      timestamp: new Date().toISOString(),
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
