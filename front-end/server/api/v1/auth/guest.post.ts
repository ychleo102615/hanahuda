/**
 * POST /api/v1/auth/guest
 *
 * @description
 * 建立訪客玩家並返回 Session Cookie。
 *
 * 參考: specs/010-player-account/contracts/auth-api.yaml
 */

import { defineEventHandler, setCookie } from 'h3'
import { getIdentityContainer } from '~~/server/identity/adapters/di/container'
import { COOKIE_NAMES, SESSION_CONFIG } from '#shared/contracts/identity-types'
import { createAuthError } from '~~/server/identity/adapters/http/auth-error-mapper'

export default defineEventHandler(async (event) => {
  const { createGuestUseCase } = getIdentityContainer()

  const result = await createGuestUseCase.execute()

  if (!result.success) {
    throw createAuthError(result.error, result.message)
  }

  // 設定 Session Cookie (HTTP-only)
  setCookie(event, COOKIE_NAMES.SESSION, result.data.sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_CONFIG.MAX_AGE,
    path: '/',
  })

  // 返回玩家資訊（不含 Session ID）
  return {
    player: {
      id: result.data.player.id,
      displayName: result.data.player.displayName,
      isGuest: result.data.player.isGuest,
      isAuthenticated: true,
    },
  }
})
