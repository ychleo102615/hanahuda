/**
 * POST /api/v1/games/:gameId/confirm-continue
 *
 * @description
 * 確認繼續遊戲命令端點。
 */

import { z } from 'zod'
import { validateSession, createSessionErrorResponse, SessionValidationError } from '~~/server/utils/sessionValidation'
import { resolve, BACKEND_TOKENS } from '~~/server/utils/container'
import type { ConfirmContinueInputPort } from '~~/server/core-game/application/ports/input/confirmContinueInputPort'
import { rateLimiter } from '~~/server/gateway/rateLimiter'
import { logger } from '~~/server/utils/logger'

const BodySchema = z.object({
  decision: z.enum(['CONTINUE', 'LEAVE'], {
    message: 'decision must be CONTINUE or LEAVE',
  }),
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

    const useCase = resolve<ConfirmContinueInputPort>(BACKEND_TOKENS.ConfirmContinueInputPort)
    await useCase.execute({
      gameId,
      playerId: session.playerId,
      decision: bodyResult.data.decision,
    })

    return { success: true }
  } catch (error) {
    if (error instanceof SessionValidationError) {
      setResponseStatus(event, error.statusCode)
      return createSessionErrorResponse(error)
    }
    logger.error('confirm-continue endpoint error', { error })
    setResponseStatus(event, 500)
    return { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } }
  }
})
