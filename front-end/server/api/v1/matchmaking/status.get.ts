/**
 * GET /api/v1/matchmaking/status - Framework Layer
 *
 * @description
 * 取得玩家目前狀態（閒置、配對中、遊戲中）。
 * 用於前端判斷玩家狀態並取得必要資訊（如 roomTypeId）。
 *
 * Response:
 * - 200: 玩家狀態
 * - 401: 未登入
 *
 * @module server/api/v1/matchmaking/status
 */

import { getIdentityPortAdapter } from '~~/server/core-game/adapters/identity/identityPortAdapter'
import { playerStatusService, type PlayerStatus } from '~~/server/gateway/playerStatusService'
import { HTTP_UNAUTHORIZED } from '#shared/constants'

/**
 * Success Response
 */
interface StatusSuccessResponse {
  success: true
  status: PlayerStatus
}

/**
 * Error Response
 */
interface StatusErrorResponse {
  success: false
  error_code: string
  message: string
}

type StatusResponse = StatusSuccessResponse | StatusErrorResponse

export default defineEventHandler(async (event): Promise<StatusResponse> => {
  // 1. 驗證身份 - 從 session 取得 playerId
  const identityPort = getIdentityPortAdapter()
  const playerId = await identityPort.getPlayerIdFromRequest(event)

  if (!playerId) {
    setResponseStatus(event, HTTP_UNAUTHORIZED)
    return {
      success: false,
      error_code: 'UNAUTHORIZED',
      message: 'Valid session is required. Please login first.',
    }
  }

  // 2. 查詢玩家狀態
  const status = await playerStatusService.getPlayerStatus(playerId)

  return {
    success: true,
    status,
  }
})
