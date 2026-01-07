/**
 * POST /api/v1/matchmaking/enter - Framework Layer
 *
 * @description
 * 將玩家加入配對佇列。
 * 驗證玩家狀態後加入佇列，嘗試立即配對。
 *
 * Request Body:
 * - room_type: 房間類型 (QUICK | STANDARD | MARATHON)
 *
 * Response:
 * - 200: 成功加入配對佇列
 * - 400: 玩家已在佇列中或已在遊戲中
 * - 401: 未登入
 * - 422: 無效的房間類型
 *
 * @see specs/011-online-matchmaking/contracts/matchmaking-api.yaml
 * @module server/api/v1/matchmaking/enter
 */

import { z } from 'zod'
import { getIdentityPortAdapter } from '~~/server/core-game/adapters/identity/identityPortAdapter'
import { getIdentityContainer } from '~~/server/identity/adapters/di/container'
import { getMatchmakingContainer } from '~~/server/matchmaking/adapters/di/container'
import { isValidRoomTypeId, type RoomTypeId } from '~~/shared/constants/roomTypes'
import type { PlayerId } from '~~/server/identity/domain/player/player'
import {
  HTTP_BAD_REQUEST,
  HTTP_UNAUTHORIZED,
} from '#shared/constants'

/**
 * Request Body Schema
 */
const EnterMatchmakingSchema = z.object({
  room_type: z.string(),
})

/**
 * Success Response
 */
interface EnterMatchmakingSuccessResponse {
  success: true
  entry_id: string
  message: string
}

/**
 * Error Response
 */
interface EnterMatchmakingErrorResponse {
  success: false
  error_code: string
  message: string
}

type EnterMatchmakingResponse = EnterMatchmakingSuccessResponse | EnterMatchmakingErrorResponse

export default defineEventHandler(async (event): Promise<EnterMatchmakingResponse> => {
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

  // 2. 取得玩家名稱
  const identityContainer = getIdentityContainer()
  const player = await identityContainer.playerRepository.findById(playerId as PlayerId)

  if (!player) {
    setResponseStatus(event, HTTP_UNAUTHORIZED)
    return {
      success: false,
      error_code: 'UNAUTHORIZED',
      message: 'Player not found.',
    }
  }

  // 3. 解析並驗證 Request Body
  const body = await readBody(event)
  const parseResult = EnterMatchmakingSchema.safeParse(body)

  if (!parseResult.success) {
    setResponseStatus(event, HTTP_BAD_REQUEST)
    return {
      success: false,
      error_code: 'INVALID_ROOM_TYPE',
      message: 'room_type is required',
    }
  }

  const { room_type: roomType } = parseResult.data

  // 4. 驗證房間類型
  if (!isValidRoomTypeId(roomType)) {
    setResponseStatus(event, HTTP_BAD_REQUEST)
    return {
      success: false,
      error_code: 'INVALID_ROOM_TYPE',
      message: `Invalid room_type: ${roomType}. Must be one of: QUICK, STANDARD, MARATHON`,
    }
  }

  // 5. 呼叫 Use Case
  const matchmakingContainer = getMatchmakingContainer()
  const result = await matchmakingContainer.enterMatchmakingUseCase.execute({
    playerId,
    playerName: player.displayName,
    roomType: roomType as RoomTypeId,
  })

  // 6. 回傳結果
  if (result.success) {
    return {
      success: true,
      entry_id: result.entryId!,
      message: result.message,
    }
  }

  // 錯誤處理
  setResponseStatus(event, HTTP_BAD_REQUEST)
  return {
    success: false,
    error_code: result.errorCode!,
    message: result.message,
  }
})
