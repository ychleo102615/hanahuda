/**
 * POST /api/v1/matchmaking/cancel - Framework Layer
 *
 * @description
 * 取消玩家的配對請求。
 *
 * Request Body:
 * - entry_id: 配對條目 ID
 *
 * Response:
 * - 200: 成功取消配對
 * - 400: 玩家不在佇列中
 * - 401: 未登入或條目不屬於該玩家
 *
 * @see specs/011-online-matchmaking/contracts/matchmaking-api.yaml
 * @module server/api/v1/matchmaking/cancel
 */

import { z } from 'zod'
import { getIdentityPortAdapter } from '~~/server/core-game/adapters/identity/identityPortAdapter'
import { getMatchmakingRegistry } from '~~/server/matchmaking/adapters/registry/matchmakingRegistrySingleton'
import { CancelMatchmakingUseCase } from '~~/server/matchmaking/application/use-cases/cancelMatchmakingUseCase'
import { getInMemoryMatchmakingPool } from '~~/server/matchmaking/adapters/persistence/inMemoryMatchmakingPool'
import {
  HTTP_BAD_REQUEST,
  HTTP_UNAUTHORIZED,
  HTTP_NOT_FOUND,
} from '#shared/constants'

/**
 * Request Body Schema
 */
const CancelMatchmakingSchema = z.object({
  entry_id: z.string().uuid('entry_id must be a valid UUID'),
})

/**
 * Success Response
 */
interface CancelMatchmakingSuccessResponse {
  success: true
  message: string
}

/**
 * Error Response
 */
interface CancelMatchmakingErrorResponse {
  success: false
  error_code: string
  message: string
}

type CancelMatchmakingResponse = CancelMatchmakingSuccessResponse | CancelMatchmakingErrorResponse

export default defineEventHandler(async (event): Promise<CancelMatchmakingResponse> => {
  // 1. 驗證身份
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

  // 2. 解析並驗證 Request Body
  const body = await readBody(event)
  const parseResult = CancelMatchmakingSchema.safeParse(body)

  if (!parseResult.success) {
    setResponseStatus(event, HTTP_BAD_REQUEST)
    return {
      success: false,
      error_code: 'INVALID_ENTRY_ID',
      message: 'entry_id is required and must be a valid UUID',
    }
  }

  const { entry_id: entryId } = parseResult.data

  // 3. 建立 Use Case 並執行
  const poolPort = getInMemoryMatchmakingPool()
  const useCase = new CancelMatchmakingUseCase(poolPort)

  const result = await useCase.execute({
    entryId,
    playerId,
  })

  // 4. 回傳結果
  if (result.success) {
    // 清除 Registry 中的計時器
    const registry = getMatchmakingRegistry()
    registry.unregisterEntry(entryId)

    return {
      success: true,
      message: result.message,
    }
  }

  // 錯誤處理
  const statusCode = result.errorCode === 'ENTRY_NOT_FOUND'
    ? HTTP_NOT_FOUND
    : result.errorCode === 'UNAUTHORIZED'
      ? HTTP_UNAUTHORIZED
      : HTTP_BAD_REQUEST

  setResponseStatus(event, statusCode)
  return {
    success: false,
    error_code: result.errorCode,
    message: result.message,
  }
})
