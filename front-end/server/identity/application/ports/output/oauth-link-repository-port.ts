/**
 * OAuth Link Repository Port
 *
 * @description
 * OAuth Link 持久化的 Output Port 介面。
 * 由 Adapter Layer 實作。
 *
 * 參考: specs/010-player-account/plan.md - Application Layer
 */

import type { OAuthLink, OAuthLinkId, OAuthProvider } from '../../../domain/oauth-link/oauth-link'
import type { AccountId } from '../../../domain/account/account'

/**
 * OAuth Link Repository Port
 *
 * 定義 OAuth Link 持久化操作的介面
 */
export abstract class OAuthLinkRepositoryPort {
  /**
   * 儲存新的 OAuthLink
   */
  abstract save(oauthLink: OAuthLink): Promise<OAuthLink>

  /**
   * 根據 ID 查詢 OAuthLink
   */
  abstract findById(id: OAuthLinkId): Promise<OAuthLink | null>

  /**
   * 根據 Provider 和 Provider User ID 查詢 OAuthLink
   */
  abstract findByProviderUserId(
    provider: OAuthProvider,
    providerUserId: string
  ): Promise<OAuthLink | null>

  /**
   * 根據 Account ID 查詢所有 OAuthLinks
   */
  abstract findByAccountId(accountId: AccountId): Promise<OAuthLink[]>

  /**
   * 刪除 OAuthLink
   */
  abstract delete(id: OAuthLinkId): Promise<void>

  /**
   * 刪除 Account 的所有 OAuthLinks
   */
  abstract deleteByAccountId(accountId: AccountId): Promise<void>
}
