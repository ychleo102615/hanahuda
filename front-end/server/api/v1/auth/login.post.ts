/**
 * POST /api/v1/auth/login
 *
 * @description
 * 帳號密碼登入。
 *
 * 參考: specs/010-player-account/contracts/auth-api.yaml
 */

import { defineEventHandler, readBody, setCookie, getHeader, getRequestIP } from 'h3'
import { getIdentityContainer } from '~~/server/identity/adapters/di/container'
import { COOKIE_NAMES, SESSION_CONFIG } from '#shared/contracts/identity-types'
import { createAuthError } from '~~/server/identity/adapters/http/auth-error-mapper'
import { createConsoleAuthLogger } from '~~/server/identity/adapters/logging/console-auth-logger'
import type { LoginRequest } from '#shared/contracts/identity-types'

const authLogger = createConsoleAuthLogger()

export default defineEventHandler(async (event) => {
  // 讀取請求 Body
  const body = await readBody<LoginRequest>(event)

  // 取得請求資訊（用於 logging）
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? null
  const userAgent = getHeader(event, 'user-agent') ?? null

  if (!body || !body.username || !body.password) {
    throw createAuthError('VALIDATION_ERROR', 'Missing required fields')
  }

  const { loginUseCase } = getIdentityContainer()

  const result = await loginUseCase.execute({
    username: body.username,
    password: body.password,
  })

  if (!result.success) {
    // FR-013a: 記錄登入失敗事件
    authLogger.logLoginFailure({
      username: body.username,
      ip,
      userAgent,
      reason: result.error === 'UNAUTHORIZED' ? 'INVALID_CREDENTIALS' : 'UNKNOWN',
    })

    throw createAuthError(result.error, result.message)
  }

  // 記錄登入成功事件（審計用途）
  authLogger.logLoginSuccess({
    username: body.username,
    playerId: result.data.player.id,
    ip,
    userAgent,
  })

  // 設定 Session Cookie (FR-012)
  setCookie(event, COOKIE_NAMES.SESSION, result.data.sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_CONFIG.MAX_AGE,
    path: '/',
  })

  // 返回玩家資訊
  return {
    player: {
      id: result.data.player.id,
      displayName: result.data.player.displayName,
      isGuest: result.data.player.isGuest,
      isAuthenticated: true,
    },
    message: 'Login successful',
  }
})
