/**
 * GET /api/v1/auth/oauth/line
 *
 * @description
 * 啟動 Line OAuth 登入流程。
 * 產生授權 URL 並重導向至 Line。
 *
 * 參考: specs/010-player-account/spec.md FR-005
 */

import { defineEventHandler, sendRedirect } from 'h3'
import { createLineOAuthAdapter } from '~~/server/identity/adapters/oauth/line-oauth-adapter'
import { saveOAuthState } from '~~/server/identity/adapters/oauth/oauth-state-store'
import { createAuthError } from '~~/server/identity/adapters/http/auth-error-mapper'

export default defineEventHandler(async (event) => {
  try {
    const lineAdapter = createLineOAuthAdapter()

    // 產生授權 URL（含 state 和 codeVerifier）
    const { url, state, codeVerifier } = lineAdapter.createAuthorizationUrlWithState({})

    // 儲存 state 和 codeVerifier（用於 CSRF 防護和 PKCE）
    saveOAuthState(state, codeVerifier)

    // 重導向至 Line 授權頁面
    return sendRedirect(event, url)

  } catch (error) {
    // OAuth 設定錯誤
    throw createAuthError(
      'OAUTH_ERROR',
      error instanceof Error ? error.message : 'Failed to initiate Line OAuth',
    )
  }
})
