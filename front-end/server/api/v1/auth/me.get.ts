/**
 * GET /api/v1/auth/me
 *
 * @description
 * 取得當前登入玩家的資訊。
 * 若未登入或 Session 過期，返回 401。
 *
 * 參考: specs/010-player-account/contracts/auth-api.yaml
 */

import { defineEventHandler, getCookie, deleteCookie } from 'h3'
import { getIdentityContainer } from '~~/server/identity/adapters/di/container'
import { COOKIE_NAMES } from '#shared/contracts/identity-types'
import { createAuthError } from '~~/server/identity/adapters/http/auth-error-mapper'

export default defineEventHandler(async (event) => {
  const sessionId = getCookie(event, COOKIE_NAMES.SESSION)

  if (!sessionId) {
    throw createAuthError('UNAUTHORIZED', 'Not authenticated')
  }

  const { getCurrentPlayerUseCase } = getIdentityContainer()

  const result = await getCurrentPlayerUseCase.execute({ sessionId })

  if (!result.success) {
    // 若 Session 過期或無效，清除 Cookie
    if (result.error === 'UNAUTHORIZED') {
      deleteCookie(event, COOKIE_NAMES.SESSION)
    }

    throw createAuthError(result.error, result.message)
  }

  return {
    player: result.data,
  }
})
