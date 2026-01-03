/**
 * GuestToken Value Object
 *
 * @description
 * 訪客身份憑證，用於 Cookie 追蹤。
 * 30 天有效期。
 *
 * 參考: specs/010-player-account/data-model.md#1.5-GuestToken
 */

import type { PlayerId } from '../player/player'

// Re-export PlayerId for convenience
export type { PlayerId } from '../player/player'

// =============================================================================
// Constants
// =============================================================================

/**
 * Guest Token 最大有效期（30 天，毫秒）
 */
export const GUEST_TOKEN_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

// =============================================================================
// Types
// =============================================================================

/**
 * GuestToken 資料結構
 */
export interface GuestToken {
  readonly playerId: PlayerId
  readonly token: string
  readonly expiresAt: Date
}

// =============================================================================
// GuestToken Functions
// =============================================================================

/**
 * 生成安全的 Token
 */
function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  // Convert to base64url (URL-safe base64 without padding)
  const base64 = btoa(String.fromCharCode(...bytes))
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * 建立新的 GuestToken
 *
 * @param playerId - 關聯的訪客玩家 ID
 */
export function createGuestToken(playerId: PlayerId): GuestToken {
  const now = new Date()
  const expiresAt = new Date(now.getTime() + GUEST_TOKEN_MAX_AGE_MS)

  return Object.freeze({
    playerId,
    token: generateToken(),
    expiresAt,
  })
}

/**
 * 檢查 GuestToken 是否已過期
 */
export function isGuestTokenExpired(token: GuestToken): boolean {
  return new Date() >= token.expiresAt
}
