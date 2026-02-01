/**
 * POST /api/v1/games/:gameId/turns/select-target
 *
 * @description
 * 選擇配對目標命令端點。
 */

import { z } from 'zod'
import { validateSession, createSessionErrorResponse, SessionValidationError } from '~~/server/utils/sessionValidation'
import { resolve, BACKEND_TOKENS } from '~~/server/utils/container'
import type { SelectTargetInputPort } from '~~/server/core-game/application/ports/input/selectTargetInputPort'
import { rateLimiter } from '~~/server/gateway/rateLimiter'
import { logger } from '~~/server/utils/logger'

const BodySchema = z.object({
  source_card_id: z.string().min(1, 'source_card_id is required'),
  target_card_id: z.string().min(1, 'target_card_id is required'),
})

export default defineEventHandler(async (event) => {
  try {
    const gameId = getRouterParam(event, 'gameId')
    if (!gameId) {
      setResponseStatus(event, 400)
      return { error: { code: 'VALIDATION_ERROR', message: 'gameId is required' } }
    }

    const session = await validateSession(event, gameId)

    const rateLimitResult = rateLimiter.check(session.playerId)
    if (!rateLimitResult.allowed) {
      setResponseStatus(event, 429)
      return { error: { code: 'RATE_LIMIT_EXCEEDED', message: `Too many requests. Retry after ${rateLimitResult.retryAfter}s` } }
    }

    const body = await readBody(event)
    const bodyResult = BodySchema.safeParse(body)
    if (!bodyResult.success) {
      setResponseStatus(event, 400)
      return { error: { code: 'VALIDATION_ERROR', message: bodyResult.error.issues[0]?.message ?? 'Invalid request body' } }
    }

    const useCase = resolve<SelectTargetInputPort>(BACKEND_TOKENS.SelectTargetInputPort)
    await useCase.execute({
      gameId,
      playerId: session.playerId,
      sourceCardId: bodyResult.data.source_card_id,
      targetCardId: bodyResult.data.target_card_id,
    })

    return { success: true }
  } catch (error) {
    if (error instanceof SessionValidationError) {
      setResponseStatus(event, error.statusCode)
      return createSessionErrorResponse(error)
    }
    logger.error('select-target endpoint error', { error })
    setResponseStatus(event, 500)
    return { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } }
  }
})
