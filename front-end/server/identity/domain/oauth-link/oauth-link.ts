/**
 * OAuthLink Entity
 *
 * @description
 * OAuth 綁定關係的 Domain Entity。
 * 支援多個 Provider 連結至同一 Account。
 *
 * 參考: specs/010-player-account/data-model.md#1.3-OAuthLink
 */

import type { AccountId } from '../account/account'

// =============================================================================
// Types
// =============================================================================

/**
 * OAuthLink ID (Branded Type)
 */
export type OAuthLinkId = string & { readonly _brand: unique symbol }

/**
 * 支援的 OAuth Provider
 */
export type OAuthProvider = 'google' | 'line' | 'telegram'

/**
 * OAuthLink Entity
 */
export interface OAuthLink {
  readonly id: OAuthLinkId
  readonly accountId: AccountId
  readonly provider: OAuthProvider
  readonly providerUserId: string
  readonly providerEmail: string | null
  readonly createdAt: Date
}

// =============================================================================
// Constants
// =============================================================================

/**
 * 支援的 OAuth Provider 列表
 */
export const SUPPORTED_PROVIDERS: readonly OAuthProvider[] = ['google', 'line', 'telegram'] as const

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * 驗證是否為有效的 OAuth Provider
 */
export function isValidOAuthProvider(provider: string): provider is OAuthProvider {
  return SUPPORTED_PROVIDERS.includes(provider as OAuthProvider)
}

/**
 * 驗證是否為有效的 Provider User ID
 */
export function isValidProviderUserId(providerUserId: string): boolean {
  return providerUserId.trim().length > 0
}

/**
 * 驗證是否為有效的 OAuthLink ID
 */
export function isValidOAuthLinkId(id: string): id is OAuthLinkId {
  // UUID v4 格式驗證
  const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidV4Regex.test(id)
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * 建立 OAuthLink Entity
 */
export function createOAuthLink(params: {
  id: OAuthLinkId
  accountId: AccountId
  provider: OAuthProvider
  providerUserId: string
  providerEmail: string | null
  createdAt: Date
}): OAuthLink {
  // 驗證 Provider
  if (!isValidOAuthProvider(params.provider)) {
    throw new Error(`Invalid OAuth provider: ${params.provider}`)
  }

  // 驗證 Provider User ID
  if (!isValidProviderUserId(params.providerUserId)) {
    throw new Error('Provider user ID is required')
  }

  return {
    id: params.id,
    accountId: params.accountId,
    provider: params.provider,
    providerUserId: params.providerUserId,
    providerEmail: params.providerEmail,
    createdAt: params.createdAt,
  }
}
