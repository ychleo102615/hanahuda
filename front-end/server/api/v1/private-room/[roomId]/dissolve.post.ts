/**
 * POST /api/private-room/:roomId/dissolve
 *
 * @description
 * 解散私人房間端點。僅房主可解散。
 * 認證方式：透過 session_id Cookie 驗證身份。
 *
 * @module server/api/private-room/[roomId]/dissolve.post
 */

import { getIdentityPortAdapter } from '~~/server/core-game/adapters/identity/identityPortAdapter'
import { getMatchmakingContainer } from '~~/server/matchmaking/adapters/di/container'
import { playerEventBus, createMatchmakingEvent } from '~~/server/shared/infrastructure/event-bus/playerEventBus'
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

    // 3. 呼叫 Use Case
    const matchmakingContainer = getMatchmakingContainer()
    const result = await matchmakingContainer.dissolvePrivateRoomUseCase.execute({
      roomId,
      playerId,
    })

    // 4. 處理結果
    if (!result.success) {
      const statusCode = result.errorCode === 'ROOM_NOT_FOUND' ? 404 : 400
      setResponseStatus(event, statusCode)
      return { error: { code: result.errorCode, message: result.message } }
    }

    // 通知受影響的訪客（若有）
    if (result.guestId) {
      playerEventBus.publishToPlayer(
        result.guestId,
        createMatchmakingEvent('RoomDissolved', {
          event_type: 'RoomDissolved',
          room_id: roomId,
          reason: 'HOST_DISSOLVED',
        })
      )
    }

    return { success: true }
  } catch (error) {
    logger.error('private-room dissolve endpoint error', { error })
    setResponseStatus(event, 500)
    return { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } }
  }
})
