/**
 * POST /api/private-room/create
 *
 * @description
 * 建立私人房間端點。
 * 認證方式：透過 session_id Cookie 驗證身份。
 * 組裝 shareUrl（baseUrl + roomId），此為 Adapter 層職責。
 *
 * @module server/api/private-room/create.post
 */

import { z } from 'zod'
import { getIdentityPortAdapter } from '~~/server/core-game/adapters/identity/identityPortAdapter'
import { getIdentityContainer } from '~~/server/identity/adapters/di/container'
import { getMatchmakingContainer } from '~~/server/matchmaking/adapters/di/container'
import type { PlayerId } from '~~/server/identity/domain/player/player'
import { logger } from '~~/server/utils/logger'

const BodySchema = z.object({
  room_type: z.enum(['SINGLE', 'QUICK', 'STANDARD', 'MARATHON'], {
    message: 'room_type must be SINGLE, QUICK, STANDARD, or MARATHON',
  }),
})

export default defineEventHandler(async (event) => {
  try {
    // 1. Cookie 認證
    const identityPort = getIdentityPortAdapter()
    const playerId = await identityPort.getPlayerIdFromRequest(event)

    if (!playerId) {
      setResponseStatus(event, 401)
      return { error: { code: 'UNAUTHORIZED', message: 'Valid session is required' } }
    }

    // 2. Body 驗證
    const body = await readBody(event)
    const bodyResult = BodySchema.safeParse(body)
    if (!bodyResult.success) {
      setResponseStatus(event, 400)
      return { error: { code: 'VALIDATION_ERROR', message: bodyResult.error.issues[0]?.message ?? 'Invalid request body' } }
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
    const result = await matchmakingContainer.createPrivateRoomUseCase.execute({
      playerId,
      playerName: player.displayName,
      roomType: bodyResult.data.room_type,
    })

    // 5. 處理結果
    if (!result.success) {
      setResponseStatus(event, 400)
      return { error: { code: result.errorCode, message: result.message } }
    }

    // 6. 組裝 shareUrl（Adapter 層職責）
    const config = useRuntimeConfig()
    const baseUrl = config.public.baseUrl as string
    const shareUrl = `${baseUrl}/room/${result.roomId}`

    return {
      success: true,
      room_id: result.roomId,
      share_url: shareUrl,
      expires_at: result.expiresAt.toISOString(),
    }
  } catch (error) {
    logger.error('private-room create endpoint error', { error })
    setResponseStatus(event, 500)
    return { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } }
  }
})
