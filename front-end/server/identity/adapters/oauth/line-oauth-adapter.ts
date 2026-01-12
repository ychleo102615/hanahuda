/**
 * Line OAuth Adapter
 *
 * @description
 * Line OAuth 2.1 的 Adapter 實作，使用 Arctic 函式庫。
 *
 * 參考: specs/010-player-account/spec.md FR-005
 */

import { Line, generateState, generateCodeVerifier } from 'arctic'
import { OAuthProviderPort, type AuthorizationUrlOptions, type CodeExchangeOptions, type TokenExchangeResult, type OAuthUserInfo } from '../../application/ports/output/oauth-provider-port'
import type { OAuthProvider } from '../../domain/oauth-link/oauth-link'
import type { ExternalUserInfo } from '../../application/ports/input/external-user-info'

// =============================================================================
// Types
// =============================================================================

/**
 * Line OAuth 設定
 */
export interface LineOAuthConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
}

/**
 * Line UserInfo API 回應
 */
interface LineUserInfoResponse {
  userId: string
  displayName?: string
  pictureUrl?: string
}

// =============================================================================
// Adapter
// =============================================================================

/**
 * Line OAuth Adapter
 */
export class LineOAuthAdapter extends OAuthProviderPort {
  readonly provider: OAuthProvider = 'line'

  private readonly line: Line
  private readonly defaultRedirectUri: string

  constructor(config: LineOAuthConfig) {
    super()
    this.line = new Line(
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
    const scopes = options.scopes || ['profile', 'openid']

    const url = this.line.createAuthorizationURL(state, codeVerifier, scopes)

    return url.toString()
  }

  /**
   * 產生授權 URL 並返回 state 和 codeVerifier
   */
  createAuthorizationUrlWithState(options: AuthorizationUrlOptions): {
    url: string
    state: string
    codeVerifier: string
  } {
    const state = options.state || generateState()
    const codeVerifier = generateCodeVerifier()
    const scopes = options.scopes || ['profile', 'openid']

    const url = this.line.createAuthorizationURL(state, codeVerifier, scopes)

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
      throw new Error('Line OAuth requires PKCE code verifier')
    }

    const tokens = await this.line.validateAuthorizationCode(options.code, options.codeVerifier)

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
    const response = await fetch('https://api.line.me/v2/profile', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch Line user info: ${response.status}`)
    }

    const data: LineUserInfoResponse = await response.json()

    return {
      providerUserId: data.userId,
      email: null, // Line 基本 scope 不提供 email
      displayName: data.displayName ?? null,
      avatarUrl: data.pictureUrl ?? null,
    }
  }

  /**
   * 驗證 State 參數
   */
  validateState(state: string, storedState: string): boolean {
    return state === storedState
  }

  /**
   * 完整 OAuth 認證流程
   *
   * @description
   * 執行 code exchange + getUserInfo，回傳標準化的 ExternalUserInfo。
   * 封裝所有 OAuth 協議細節，讓呼叫者不需要知道 Token 交換等技術細節。
   *
   * @param code - OAuth 授權碼
   * @param codeVerifier - PKCE code verifier
   * @returns 標準化的使用者資訊
   */
  async authenticate(code: string, codeVerifier: string): Promise<ExternalUserInfo> {
    // 1. 交換 Token（OAuth 協議細節）
    const tokens = await this.exchangeCode({ code, codeVerifier })

    // 2. 取得使用者資訊（外部 API 呼叫）
    const oauthUser = await this.getUserInfo(tokens.accessToken)

    // 3. 轉換為標準化 DTO
    return {
      provider: this.provider,
      providerUserId: oauthUser.providerUserId,
      email: oauthUser.email,
      displayName: oauthUser.displayName,
    }
  }
}

// =============================================================================
// Factory
// =============================================================================

/**
 * 建立 Line OAuth Adapter
 */
export function createLineOAuthAdapter(): LineOAuthAdapter {
  const clientId = process.env.LINE_CLIENT_ID
  const clientSecret = process.env.LINE_CLIENT_SECRET
  const redirectUri = process.env.LINE_REDIRECT_URI || 'http://localhost:5173/api/v1/auth/oauth/line/callback'

  if (!clientId || !clientSecret) {
    throw new Error('Line OAuth credentials not configured')
  }

  return new LineOAuthAdapter({
    clientId,
    clientSecret,
    redirectUri,
  })
}
