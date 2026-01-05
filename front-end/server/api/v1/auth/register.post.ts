/**
 * POST /api/v1/auth/register
 *
 * @description
 * 註冊新帳號。
 * 將訪客升級為註冊玩家 (FR-009)。
 *
 * 參考: specs/010-player-account/contracts/auth-api.yaml
 */

import { defineEventHandler, readBody, getCookie } from 'h3'
import { getIdentityContainer } from '~~/server/identity/adapters/di/container'
import { COOKIE_NAMES } from '#shared/contracts/identity-types'
import { createAuthError } from '~~/server/identity/adapters/http/auth-error-mapper'
import type { RegisterRequest } from '#shared/contracts/identity-types'

export default defineEventHandler(async (event) => {
  // 取得 Session ID
  const sessionId = getCookie(event, COOKIE_NAMES.SESSION)
  if (!sessionId) {
    throw createAuthError('UNAUTHORIZED', 'Not authenticated')
  }

  // 讀取請求 Body
  const body = await readBody<RegisterRequest>(event)

  if (!body || !body.username || !body.password || !body.confirmPassword) {
    throw createAuthError('VALIDATION_ERROR', 'Missing required fields')
  }

  const { registerAccountUseCase } = getIdentityContainer()

  const result = await registerAccountUseCase.execute({
    sessionId,
    username: body.username,
    password: body.password,
    confirmPassword: body.confirmPassword,
    email: body.email,
  })

  if (!result.success) {
    throw createAuthError(result.error, result.message)
  }

  // 返回玩家資訊
  return {
    player: {
      id: result.data.player.id,
      displayName: result.data.player.displayName,
      isGuest: result.data.player.isGuest,
      isAuthenticated: true,
    },
    message: 'Registration successful',
  }
})
