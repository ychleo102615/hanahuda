/**
 * POST /api/v1/games/:gameId/leave
 *
 * @description
 * 離開遊戲命令端點。
 */

import { validateSession, createSessionErrorResponse, SessionValidationError } from '~~/server/utils/sessionValidation'
import { resolve, BACKEND_TOKENS } from '~~/server/utils/container'
import type { LeaveGameInputPort } from '~~/server/core-game/application/ports/input/leaveGameInputPort'
import { rateLimiter } from '~~/server/gateway/rateLimiter'
import { logger } from '~~/server/utils/logger'

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

    const useCase = resolve<LeaveGameInputPort>(BACKEND_TOKENS.LeaveGameInputPort)
    await useCase.execute({
      gameId,
      playerId: session.playerId,
    })

    return { success: true }
  } catch (error) {
    if (error instanceof SessionValidationError) {
      setResponseStatus(event, error.statusCode)
      return createSessionErrorResponse(error)
    }
    logger.error('leave-game endpoint error', { error })
    setResponseStatus(event, 500)
    return { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } }
  }
})
