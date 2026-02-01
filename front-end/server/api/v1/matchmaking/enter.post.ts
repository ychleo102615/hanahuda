/**
 * POST /api/v1/matchmaking/enter
 *
 * @description
 * 進入配對佇列端點。
 * 從 wsCommandHandler.handleJoinMatchmaking 提取邏輯，改為 REST API。
 */

import { z } from 'zod'
import { getIdentityPortAdapter } from '~~/server/core-game/adapters/identity/identityPortAdapter'
import { getIdentityContainer } from '~~/server/identity/adapters/di/container'
import { getMatchmakingContainer } from '~~/server/matchmaking/adapters/di/container'
import { getMatchmakingRegistry } from '~~/server/matchmaking/adapters/registry/matchmakingRegistrySingleton'
import { getInMemoryMatchmakingPool } from '~~/server/matchmaking/adapters/persistence/inMemoryMatchmakingPool'
import type { BotFallbackInfo } from '~~/server/matchmaking/adapters/registry/matchmakingRegistry'
import type { PlayerId } from '~~/server/identity/domain/player/player'
import { rateLimiter } from '~~/server/gateway/rateLimiter'
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

    // 2. Rate Limiting
    const rateLimitResult = rateLimiter.check(playerId)
    if (!rateLimitResult.allowed) {
      setResponseStatus(event, 429)
      return { error: { code: 'RATE_LIMIT_EXCEEDED', message: `Too many requests. Retry after ${rateLimitResult.retryAfter}s` } }
    }

    // 3. Body 驗證
    const body = await readBody(event)
    const bodyResult = BodySchema.safeParse(body)
    if (!bodyResult.success) {
      setResponseStatus(event, 400)
      return { error: { code: 'VALIDATION_ERROR', message: bodyResult.error.issues[0]?.message ?? 'Invalid request body' } }
    }

    // 4. 取得玩家名稱
    const identityContainer = getIdentityContainer()
    const player = await identityContainer.playerRepository.findById(playerId as PlayerId)

    if (!player) {
      setResponseStatus(event, 404)
      return { error: { code: 'PLAYER_NOT_FOUND', message: 'Player not found' } }
    }

    // 5. 呼叫 Use Case
    const matchmakingContainer = getMatchmakingContainer()
    const result = await matchmakingContainer.enterMatchmakingUseCase.execute({
      playerId,
      playerName: player.displayName,
      roomType: bodyResult.data.room_type,
    })

    // 6. 處理結果
    if (!result.success) {
      setResponseStatus(event, 400)
      return { error: { code: result.errorCode ?? 'MATCHMAKING_ERROR', message: result.message } }
    }

    // 7. 如果是等待配對狀態，註冊到 MatchmakingRegistry
    const isWaitingForMatch = result.message.includes('Searching')

    if (isWaitingForMatch && result.entryId) {
      const registry = getMatchmakingRegistry()
      const pool = getInMemoryMatchmakingPool()
      const entry = await pool.findById(result.entryId)

      if (entry) {
        const { processMatchmakingUseCase } = matchmakingContainer
        const botFallbackCallback = async (info: BotFallbackInfo) => {
          try {
            await processMatchmakingUseCase.executeBotFallback({
              entryId: info.entryId,
              playerId: info.playerId,
              playerName: info.playerName,
              roomType: info.roomType,
            })
          } catch (error) {
            logger.error('Bot fallback failed', { error })
          }
        }

        registry.registerEntry(entry, () => {}, botFallbackCallback)
      }
    }

    return { success: true }
  } catch (error) {
    logger.error('matchmaking enter endpoint error', { error })
    setResponseStatus(event, 500)
    return { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } }
  }
})
