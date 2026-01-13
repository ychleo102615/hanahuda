/**
 * GET /api/v1/auth/oauth/google/callback
 *
 * @description
 * Google OAuth 回調處理。
 * 接收授權碼，交換 Token，執行登入/註冊流程。
 *
 * 參考: specs/010-player-account/spec.md FR-004
 */

import { defineEventHandler, getQuery, setCookie, sendRedirect } from 'h3'
import { createGoogleOAuthAdapter } from '~~/server/identity/adapters/oauth/google-oauth-adapter'
import { consumeOAuthState } from '~~/server/identity/adapters/oauth/oauth-state-store'
import { getIdentityContainer } from '~~/server/identity/adapters/di/container'
import { COOKIE_NAMES, SESSION_CONFIG } from '#shared/contracts/identity-types'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  // 檢查 OAuth 錯誤
  if (query.error) {
    const errorDescription = query.error_description || 'OAuth authorization failed'
    return sendRedirect(event, `/login?error=${encodeURIComponent(String(errorDescription))}`)
  }

  // 驗證必要參數
  const code = query.code as string
  const state = query.state as string

  if (!code || !state) {
    return sendRedirect(event, '/login?error=Missing+OAuth+parameters')
  }

  // 驗證 state 並取得 codeVerifier（CSRF 防護 + PKCE）
  const storedEntry = consumeOAuthState(state)

  if (!storedEntry) {
    return sendRedirect(event, '/login?error=Invalid+or+expired+OAuth+state')
  }

  if (!storedEntry.codeVerifier) {
    return sendRedirect(event, '/login?error=Missing+code+verifier')
  }

  try {
    const googleAdapter = createGoogleOAuthAdapter()
    const { externalAuthLoginUseCase } = getIdentityContainer()

    // Step 1: Adapter 處理 OAuth 技術細節（code exchange + getUserInfo）
    const userInfo = await googleAdapter.authenticate(code, storedEntry.codeVerifier)

    // Step 2: UseCase 處理業務邏輯（檢查連結、自動連結、建立帳號）
    const result = await externalAuthLoginUseCase.execute({ userInfo })

    if (!result.success) {
      return sendRedirect(event, `/login?error=${encodeURIComponent(result.message || 'OAuth login failed')}`)
    }

    // 設定 Session Cookie
    setCookie(event, COOKIE_NAMES.SESSION, result.data.sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_CONFIG.MAX_AGE,
      path: '/',
    })

    // 根據結果類型決定重導向目標
    switch (result.data.type) {
      case 'LOGGED_IN':
        // 已連結帳號，直接登入
        return sendRedirect(event, '/lobby')

      case 'NEW_ACCOUNT':
        // 新帳號建立成功
        return sendRedirect(event, '/lobby?welcome=true')

      case 'AUTO_LINKED':
        // Email 匹配現有帳號，自動連結
        return sendRedirect(event, '/lobby')

      default:
        return sendRedirect(event, '/lobby')
    }

  } catch (error) {
    const message = error instanceof Error ? error.message : 'OAuth callback failed'
    return sendRedirect(event, `/login?error=${encodeURIComponent(message)}`)
  }
})
