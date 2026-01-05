/**
 * CurrentPlayer Value Object
 *
 * @description
 * 前端用於表示當前玩家狀態的 Domain 物件。
 *
 * 參考: specs/010-player-account/data-model.md#8-Frontend-Domain-Model
 */

import type { PlayerInfo } from '#shared/contracts/identity-types'

// =============================================================================
// Types
// =============================================================================

/**
 * 當前玩家狀態
 *
 * 與後端 PlayerInfo 相同結構
 */
export interface CurrentPlayer extends PlayerInfo {}

// =============================================================================
// Constants
// =============================================================================

/**
 * 未登入狀態的預設值
 */
export const ANONYMOUS_PLAYER: CurrentPlayer = {
  id: '',
  displayName: '',
  isGuest: true,
  isAuthenticated: false,
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * 檢查是否為已認證的玩家
 */
export function isAuthenticated(player: CurrentPlayer): boolean {
  return player.isAuthenticated && player.id !== ''
}

/**
 * 檢查是否為訪客
 */
export function isGuestPlayer(player: CurrentPlayer): boolean {
  return player.isGuest && player.isAuthenticated
}

/**
 * 檢查是否為已註冊玩家
 */
export function isRegisteredPlayer(player: CurrentPlayer): boolean {
  return !player.isGuest && player.isAuthenticated
}
