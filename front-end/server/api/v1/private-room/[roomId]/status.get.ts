/**
 * GET /api/private-room/:roomId/status
 *
 * @description
 * 查詢私人房間狀態。
 * 認證方式：透過 session_id Cookie 驗證身份。
 *
 * @module server/api/private-room/[roomId]/status.get
 */

import { getIdentityPortAdapter } from '~~/server/core-game/adapters/identity/identityPortAdapter'
import { getInMemoryPrivateRoomStore } from '~~/server/matchmaking/adapters/persistence/inMemoryPrivateRoomStore'
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

    // 3. 查詢房間
    const store = getInMemoryPrivateRoomStore()
    const room = await store.findByRoomId(roomId)

    if (!room) {
      setResponseStatus(event, 404)
      return { error: { code: 'ROOM_NOT_FOUND', message: 'Room not found' } }
    }

    // 4. 驗證請求者是房間成員
    if (!room.hasPlayer(playerId)) {
      setResponseStatus(event, 403)
      return { error: { code: 'NOT_A_MEMBER', message: 'You are not a member of this room' } }
    }

    return {
      room_id: room.roomId,
      status: room.status,
      room_type: room.roomType,
      host_name: room.hostName,
      guest_name: room.guestName,
      expires_at: room.expiresAt.toISOString(),
    }
  } catch (error) {
    logger.error('private-room status endpoint error', { error })
    setResponseStatus(event, 500)
    return { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } }
  }
})
