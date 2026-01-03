/**
 * OAuth State Store
 *
 * @description
 * 儲存 OAuth state 和 code verifier（防 CSRF）。
 * 使用 in-memory 實作，5 分鐘過期。
 *
 * 參考: specs/010-player-account/plan.md - Adapter Layer
 */

// =============================================================================
// Types
// =============================================================================

interface OAuthStateEntry {
  state: string
  codeVerifier?: string // Google PKCE
  createdAt: number
}

// =============================================================================
// Constants
// =============================================================================

const STATE_TTL_MS = 5 * 60 * 1000 // 5 分鐘

// =============================================================================
// Store
// =============================================================================

const stateStore = new Map<string, OAuthStateEntry>()

/**
 * 儲存 OAuth state
 */
export function saveOAuthState(state: string, codeVerifier?: string): void {
  // 清理過期的 entries
  cleanupExpiredStates()

  stateStore.set(state, {
    state,
    codeVerifier,
    createdAt: Date.now(),
  })
}

/**
 * 取得並刪除 OAuth state（一次性使用）
 */
export function consumeOAuthState(state: string): OAuthStateEntry | null {
  const entry = stateStore.get(state)

  if (!entry) {
    return null
  }

  // 檢查是否過期
  if (Date.now() - entry.createdAt > STATE_TTL_MS) {
    stateStore.delete(state)
    return null
  }

  // 一次性使用，刪除
  stateStore.delete(state)

  return entry
}

/**
 * 清理過期的 states
 */
function cleanupExpiredStates(): void {
  const now = Date.now()

  for (const [key, entry] of stateStore.entries()) {
    if (now - entry.createdAt > STATE_TTL_MS) {
      stateStore.delete(key)
    }
  }
}
