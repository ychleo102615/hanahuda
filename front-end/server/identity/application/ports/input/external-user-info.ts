/**
 * ExternalUserInfo
 *
 * @description
 * 第三方認證用戶資訊的抽象 DTO。
 * Application Layer 只看到這個介面，不知道具體的認證提供者細節
 * （如 OAuth code exchange 流程、Telegram initData 驗證等）。
 *
 * 此 DTO 由 Adapter Layer 負責建立，Use Case 僅消費此資訊。
 */

import type { OAuthProvider } from '../../../domain/oauth-link/oauth-link'

// =============================================================================
// Types
// =============================================================================

/**
 * 第三方認證用戶資訊
 *
 * @description
 * 統一的第三方認證用戶資訊格式，支援所有認證提供者
 * （Google OAuth、LINE OAuth、Telegram Mini App 等）。
 */
export interface ExternalUserInfo {
  /** 認證提供者類型 */
  readonly provider: OAuthProvider
  /** 提供者端的唯一用戶 ID */
  readonly providerUserId: string
  /** 用戶 Email（可能為 null，如 Telegram 不提供） */
  readonly email: string | null
  /** 顯示名稱 */
  readonly displayName: string | null
}

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * 驗證 ExternalUserInfo 是否有效
 */
export function isValidExternalUserInfo(info: ExternalUserInfo): boolean {
  return (
    info.providerUserId.trim().length > 0 &&
    info.provider !== undefined
  )
}
