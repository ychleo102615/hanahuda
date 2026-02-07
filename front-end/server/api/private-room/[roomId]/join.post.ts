/**
 * POST /api/private-room/:roomId/join
 *
 * @description
 * 加入私人房間端點。
 * 認證方式：透過 session_id Cookie 驗證身份。
 *
 * @module server/api/private-room/[roomId]/join.post
 */

import { getIdentityPortAdapter } from '~~/server/core-game/adapters/identity/identityPortAdapter'
import { getIdentityContainer } from '~~/server/identity/adapters/di/container'
import { getMatchmakingContainer } from '~~/server/matchmaking/adapters/di/container'
import type { PlayerId } from '~~/server/identity/domain/player/player'
import { logger } from '~~/server/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    // 1. Cookie 認證
    const identityPort = getIdentityPortAdapter()
    const playerId = await identityPort.getPlayerIdFromRequest(event)

    if (!playerId) {
      setResponseStatus(event, 401)
      return { error: { code: 'UNAUTHORIZED', message: 'Valid session is required' } }
    }

    // 2. Path param
    const roomId = getRouterParam(event, 'roomId')
    if (!roomId) {
      setResponseStatus(event, 400)
      return { error: { code: 'VALIDATION_ERROR', message: 'Room ID is required' } }
    }

    // 3. 取得玩家名稱
    const identityContainer = getIdentityContainer()
    const player = await identityContainer.playerRepository.findById(playerId as PlayerId)

    if (!player) {
      setResponseStatus(event, 404)
      return { error: { code: 'PLAYER_NOT_FOUND', message: 'Player not found' } }
    }

    // 4. 呼叫 Use Case
    const matchmakingContainer = getMatchmakingContainer()
    const result = await matchmakingContainer.joinPrivateRoomUseCase.execute({
      roomId,
      playerId,
      playerName: player.displayName,
    })

    // 5. 處理結果
    if (!result.success) {
      const statusCode = result.errorCode === 'ROOM_NOT_FOUND' ? 404 : 400
      setResponseStatus(event, statusCode)
      return { error: { code: result.errorCode, message: result.message } }
    }

    return {
      success: true,
      room_id: result.roomId,
      host_name: result.hostName,
      room_type: result.roomType,
    }
  } catch (error) {
    logger.error('private-room join endpoint error', { error })
    setResponseStatus(event, 500)
    return { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } }
  }
})
