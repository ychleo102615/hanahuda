/**
 * GET /api/v1/auth/oauth/google
 *
 * @description
 * 啟動 Google OAuth 登入流程。
 * 產生授權 URL 並重導向至 Google。
 *
 * 參考: specs/010-player-account/spec.md FR-004
 */

import { defineEventHandler, sendRedirect } from 'h3'
import { createGoogleOAuthAdapter } from '~~/server/identity/adapters/oauth/google-oauth-adapter'
import { saveOAuthState } from '~~/server/identity/adapters/oauth/oauth-state-store'
import { createAuthError } from '~~/server/identity/adapters/http/auth-error-mapper'

export default defineEventHandler(async (event) => {
  try {
    const googleAdapter = createGoogleOAuthAdapter()

    // 產生授權 URL（含 state 和 codeVerifier）
    const { url, state, codeVerifier } = googleAdapter.createAuthorizationUrlWithVerifier({})

    // 儲存 state 和 codeVerifier（用於 CSRF 防護和 PKCE）
    saveOAuthState(state, codeVerifier)

    // 重導向至 Google 授權頁面
    return sendRedirect(event, url)

  } catch (error) {
    // OAuth 設定錯誤
    throw createAuthError(
      'OAUTH_ERROR',
      error instanceof Error ? error.message : 'Failed to initiate Google OAuth',
    )
  }
})
