/**
 * OAuth Provider Port
 *
 * @deprecated
 * 此 Port 已不再被 Application Layer 使用。
 * OAuth Adapter 現在直接被 API Endpoint 呼叫，不經過 UseCase。
 *
 * 保留原因：
 * - GoogleOAuthAdapter / LineOAuthAdapter 仍 extends 此類別
 * - 提供共用的類型定義（AuthorizationUrlOptions、CodeExchangeOptions 等）
 *
 * 未來計畫：
 * - 將 Adapter 重新命名為 Client（如 GoogleOAuthClient）
 * - 移除此 Port，讓 Client 成為獨立的工具類
 *
 * @description
 * OAuth Provider 的 Output Port 介面。
 * 由 Adapter Layer 實作（Google, Line 等）。
 *
 * 參考: specs/010-player-account/plan.md - Application Layer
 */

import type { OAuthProvider } from '../../../domain/oauth-link/oauth-link'

// =============================================================================
// Types
// =============================================================================

/**
 * OAuth 使用者資訊
 */
export interface OAuthUserInfo {
  /** Provider 的使用者 ID */
  providerUserId: string
  /** 使用者 Email（可能為 null） */
  email: string | null
  /** 顯示名稱 */
  displayName: string | null
  /** 頭像 URL */
  avatarUrl: string | null
}

/**
 * OAuth 授權 URL 選項
 */
export interface AuthorizationUrlOptions {
  /** 重定向 URI（可選，使用預設值） */
  redirectUri?: string
  /** 狀態參數（防 CSRF，可選，會自動生成） */
  state?: string
  /** OAuth scope（可選） */
  scopes?: string[]
}

/**
 * OAuth 授權碼交換選項
 */
export interface CodeExchangeOptions {
  /** 授權碼 */
  code: string
  /** 重定向 URI（某些 Provider 需要） */
  redirectUri?: string
  /** PKCE Code Verifier（Google 需要） */
  codeVerifier?: string
}

/**
 * OAuth Token 交換結果
 */
export interface TokenExchangeResult {
  /** Access Token */
  accessToken: string
  /** Refresh Token（可選） */
  refreshToken?: string
  /** Token 過期時間（秒） */
  expiresIn?: number
}

// =============================================================================
// Port Interface
// =============================================================================

/**
 * OAuth Provider Port
 *
 * 定義 OAuth Provider 操作的介面
 */
export abstract class OAuthProviderPort {
  /** Provider 類型 */
  abstract readonly provider: OAuthProvider

  /**
   * 產生授權 URL
   */
  abstract createAuthorizationUrl(options: AuthorizationUrlOptions): string

  /**
   * 交換授權碼為 Token
   */
  abstract exchangeCode(options: CodeExchangeOptions): Promise<TokenExchangeResult>

  /**
   * 取得使用者資訊
   */
  abstract getUserInfo(accessToken: string): Promise<OAuthUserInfo>

  /**
   * 驗證 State 參數
   */
  abstract validateState(state: string, storedState: string): boolean
}
