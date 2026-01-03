/**
 * Session Value Object
 *
 * @description
 * Session 資訊，用於認證狀態管理。
 * 支援滑動過期（7 天有效期）。
 *
 * 參考: specs/010-player-account/data-model.md#1.4-Session
 */

import type { PlayerId } from '../player/player'

// Re-export PlayerId for convenience
export type { PlayerId } from '../player/player'

// =============================================================================
// Constants
// =============================================================================

/**
 * Session 最大有效期（7 天，毫秒）
 */
export const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

// =============================================================================
// Types
// =============================================================================

/**
 * Session ID - base64url encoded 32 bytes
 */
export type SessionId = string & { readonly _brand: unique symbol }

/**
 * Session 資料結構
 */
export interface Session {
  readonly id: SessionId
  readonly playerId: PlayerId
  readonly createdAt: Date
  readonly expiresAt: Date
  readonly lastAccessedAt: Date
}

// =============================================================================
// Session Functions
// =============================================================================

/**
 * 生成安全的 Session ID
 *
 * 使用 crypto.randomBytes(32) 生成 256-bit 隨機值，
 * 然後以 base64url 編碼。
 */
function generateSessionId(): SessionId {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  // Convert to base64url (URL-safe base64 without padding)
  const base64 = btoa(String.fromCharCode(...bytes))
  const base64url = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return base64url as SessionId
}

/**
 * 建立新的 Session
 *
 * @param playerId - 關聯的玩家 ID
 */
export function createSession(playerId: PlayerId): Session {
  const now = new Date()
  const expiresAt = new Date(now.getTime() + SESSION_MAX_AGE_MS)

  return Object.freeze({
    id: generateSessionId(),
    playerId,
    createdAt: now,
    expiresAt,
    lastAccessedAt: now,
  })
}

/**
 * 檢查 Session 是否已過期
 */
export function isSessionExpired(session: Session): boolean {
  return new Date() >= session.expiresAt
}

/**
 * 刷新 Session（滑動過期 FR-012）
 *
 * 更新 lastAccessedAt 並延長 expiresAt
 *
 * @throws Error 如果 Session 已過期
 */
export function refreshSession(session: Session): Session {
  if (isSessionExpired(session)) {
    throw new Error('Cannot refresh expired session')
  }

  const now = new Date()
  const newExpiresAt = new Date(now.getTime() + SESSION_MAX_AGE_MS)

  return Object.freeze({
    ...session,
    lastAccessedAt: now,
    expiresAt: newExpiresAt,
  })
}
