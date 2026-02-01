/**
 * POST /api/v1/games/:gameId/turns/play-card
 *
 * @description
 * 打出手牌命令端點。
 */

import { z } from 'zod'
import { validateSession, createSessionErrorResponse, SessionValidationError } from '~~/server/utils/sessionValidation'
import { resolve, BACKEND_TOKENS } from '~~/server/utils/container'
import type { PlayHandCardInputPort } from '~~/server/core-game/application/ports/input/playHandCardInputPort'
import { rateLimiter } from '~~/server/gateway/rateLimiter'
import { logger } from '~~/server/utils/logger'

const BodySchema = z.object({
  card_id: z.string().min(1, 'card_id is required'),
  target_card_id: z.string().min(1).optional(),
})

export default defineEventHandler(async (event) => {
  try {
    const gameId = getRouterParam(event, 'gameId')
    if (!gameId) {
      setResponseStatus(event, 400)
      return { error: { code: 'VALIDATION_ERROR', message: 'gameId is required' } }
    }

    // Session 驗證
    const session = await validateSession(event, gameId)

    // Rate Limiting
    const rateLimitResult = rateLimiter.check(session.playerId)
    if (!rateLimitResult.allowed) {
      setResponseStatus(event, 429)
      return { error: { code: 'RATE_LIMIT_EXCEEDED', message: `Too many requests. Retry after ${rateLimitResult.retryAfter}s` } }
    }

    // Body 驗證
    const body = await readBody(event)
    const bodyResult = BodySchema.safeParse(body)
    if (!bodyResult.success) {
      setResponseStatus(event, 400)
      return { error: { code: 'VALIDATION_ERROR', message: bodyResult.error.issues[0]?.message ?? 'Invalid request body' } }
    }

    // 執行 Use Case
    const useCase = resolve<PlayHandCardInputPort>(BACKEND_TOKENS.PlayHandCardInputPort)
    await useCase.execute({
      gameId,
      playerId: session.playerId,
      cardId: bodyResult.data.card_id,
      targetCardId: bodyResult.data.target_card_id,
    })

    return { success: true }
  } catch (error) {
    if (error instanceof SessionValidationError) {
      setResponseStatus(event, error.statusCode)
      return createSessionErrorResponse(error)
    }
    logger.error('play-card endpoint error', { error })
    setResponseStatus(event, 500)
    return { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } }
  }
})
