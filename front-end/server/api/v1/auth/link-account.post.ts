/**
 * POST /api/v1/auth/link-account
 *
 * @description
 * 手動連結 OAuth 帳號至現有帳號。
 * 當 OAuth 登入發現 Email 已存在但無法自動連結時使用。
 *
 * 參考: specs/010-player-account/spec.md FR-006b
 */

import { defineEventHandler, readBody, setCookie } from 'h3'
import { z } from 'zod'
import { getIdentityContainer } from '~~/server/identity/adapters/di/container'
import { COOKIE_NAMES, SESSION_CONFIG } from '#shared/contracts/identity-types'
import { createAuthError } from '~~/server/identity/adapters/http/auth-error-mapper'
import type { OAuthProvider } from '~~/server/identity/domain/oauth-link/oauth-link'

/**
 * 連結帳號請求 Schema
 */
const linkAccountSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  provider: z.enum(['google', 'line']),
  providerUserId: z.string().min(1, 'Provider user ID is required'),
  providerEmail: z.string().email().nullable().optional(),
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  // 驗證請求
  const parseResult = linkAccountSchema.safeParse(body)
  if (!parseResult.success) {
    throw createAuthError('VALIDATION_ERROR', parseResult.error.issues[0]?.message || 'Invalid request body')
  }

  const { username, password, provider, providerUserId, providerEmail } = parseResult.data

  // 執行連結
  const { linkAccountUseCase } = getIdentityContainer()
  const result = await linkAccountUseCase.execute({
    username,
    password,
    provider: provider as OAuthProvider,
    providerUserId,
    providerEmail: providerEmail ?? null,
  })

  if (!result.success) {
    throw createAuthError(result.error, result.message || 'Failed to link account')
  }

  // 設定 Session Cookie
  setCookie(event, COOKIE_NAMES.SESSION, result.data.sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_CONFIG.MAX_AGE,
    path: '/',
  })

  return {
    player: result.data.player,
  }
})
