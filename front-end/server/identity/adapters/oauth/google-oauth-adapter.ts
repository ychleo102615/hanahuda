/**
 * Google OAuth Adapter
 *
 * @description
 * Google OAuth 2.0 的 Adapter 實作，使用 Arctic 函式庫。
 *
 * 參考: specs/010-player-account/spec.md FR-004
 */

import { Google, generateState, generateCodeVerifier } from 'arctic'
import { OAuthProviderPort, type AuthorizationUrlOptions, type CodeExchangeOptions, type TokenExchangeResult, type OAuthUserInfo } from '../../application/ports/output/oauth-provider-port'
import type { OAuthProvider } from '../../domain/oauth-link/oauth-link'

// =============================================================================
// Types
// =============================================================================

/**
 * Google OAuth 設定
 */
export interface GoogleOAuthConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
}

/**
 * Google UserInfo API 回應
 */
interface GoogleUserInfoResponse {
  sub: string
  email?: string
  email_verified?: boolean
  name?: string
  picture?: string
}

// =============================================================================
// Adapter
// =============================================================================

/**
 * Google OAuth Adapter
 */
export class GoogleOAuthAdapter extends OAuthProviderPort {
  readonly provider: OAuthProvider = 'google'

  private readonly google: Google
  private readonly defaultRedirectUri: string

  constructor(config: GoogleOAuthConfig) {
    super()
    this.google = new Google(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    )
    this.defaultRedirectUri = config.redirectUri
  }

  /**
   * 產生授權 URL
   */
  createAuthorizationUrl(options: AuthorizationUrlOptions): string {
    const state = options.state || generateState()
    const codeVerifier = generateCodeVerifier()

    const scopes = options.scopes || ['openid', 'email', 'profile']

    const url = this.google.createAuthorizationURL(state, codeVerifier, scopes)

    // 儲存 codeVerifier 供後續使用（實際應用需持久化）
    // 這裡返回 URL，codeVerifier 需要另外處理
    return url.toString()
  }

  /**
   * 產生授權 URL 並返回 state 和 codeVerifier
   */
  createAuthorizationUrlWithVerifier(options: AuthorizationUrlOptions): {
    url: string
    state: string
    codeVerifier: string
  } {
    const state = options.state || generateState()
    const codeVerifier = generateCodeVerifier()
    const scopes = options.scopes || ['openid', 'email', 'profile']

    const url = this.google.createAuthorizationURL(state, codeVerifier, scopes)

    return {
      url: url.toString(),
      state,
      codeVerifier,
    }
  }

  /**
   * 交換授權碼為 Token
   */
  async exchangeCode(options: CodeExchangeOptions): Promise<TokenExchangeResult> {
    if (!options.codeVerifier) {
      throw new Error('Google OAuth requires PKCE code verifier')
    }

    const tokens = await this.google.validateAuthorizationCode(options.code, options.codeVerifier)

    return {
      accessToken: tokens.accessToken(),
      refreshToken: tokens.hasRefreshToken() ? tokens.refreshToken() : undefined,
      expiresIn: tokens.accessTokenExpiresInSeconds(),
    }
  }

  /**
   * 取得使用者資訊
   */
  async getUserInfo(accessToken: string): Promise<OAuthUserInfo> {
    const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch Google user info: ${response.status}`)
    }

    const data: GoogleUserInfoResponse = await response.json()

    return {
      providerUserId: data.sub,
      email: data.email_verified ? data.email ?? null : null,
      displayName: data.name ?? null,
      avatarUrl: data.picture ?? null,
    }
  }

  /**
   * 驗證 State 參數
   */
  validateState(state: string, storedState: string): boolean {
    return state === storedState
  }
}

// =============================================================================
// Factory
// =============================================================================

/**
 * 建立 Google OAuth Adapter
 */
export function createGoogleOAuthAdapter(): GoogleOAuthAdapter {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5173/api/v1/auth/oauth/google/callback'

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured')
  }

  return new GoogleOAuthAdapter({
    clientId,
    clientSecret,
    redirectUri,
  })
}
