/**
 * SessionContext Adapter
 *
 * @description
 * 實作 SessionContextPort，使用 sessionStorage 儲存會話資訊。
 *
 * 儲存：
 * - entryId: 配對條目 ID（用於取消配對）
 * - currentGameId: 遊戲 ID（用於頁面刷新後重連）
 *
 * 不在此模組中管理的資訊：
 * - roomTypeId: 由 gameState.roomTypeId 管理（來自 SSE 事件）
 * - playerId/playerName: 由 useAuthStore 管理（來自 auth/me API）
 * - gameFinished: 由 gameState.gameEnded 管理
 * - session_token: 由 HttpOnly Cookie 管理
 *
 * @module user-interface/adapter/session/SessionContextAdapter
 */

import { SessionContextPort } from '../../application/ports/output/session-context.port'

/**
 * sessionStorage 鍵名常數
 */
const STORAGE_KEYS = {
  currentGameId: 'current_game_id',
  entryId: 'matchmaking_entry_id',
} as const

/**
 * SessionContext Adapter
 *
 * @description
 * 封裝 sessionStorage 操作，提供型別安全的 session 資訊存取。
 */
export class SessionContextAdapter extends SessionContextPort {
  // === Game Session ===

  /**
   * 取得當前遊戲 ID
   *
   * @returns 遊戲 ID，若無則返回 null
   */
  getCurrentGameId(): string | null {
    if (typeof window === 'undefined') {
      return null
    }
    return sessionStorage.getItem(STORAGE_KEYS.currentGameId)
  }

  /**
   * 設定當前遊戲 ID
   *
   * @param gameId - 遊戲 ID，傳入 null 可清除
   */
  setCurrentGameId(gameId: string | null): void {
    if (typeof window === 'undefined') {
      return
    }
    if (gameId === null) {
      sessionStorage.removeItem(STORAGE_KEYS.currentGameId)
    } else {
      sessionStorage.setItem(STORAGE_KEYS.currentGameId, gameId)
    }
  }

  /**
   * 檢查是否有進行中的遊戲
   *
   * @returns 是否有 currentGameId
   */
  hasActiveGame(): boolean {
    return this.getCurrentGameId() !== null
  }

  // === Online Matchmaking ===

  /**
   * 取得配對條目 ID
   *
   * @returns 配對條目 ID，若無則返回 null
   */
  getEntryId(): string | null {
    if (typeof window === 'undefined') {
      return null
    }
    return sessionStorage.getItem(STORAGE_KEYS.entryId)
  }

  /**
   * 設定配對條目 ID
   *
   * @param entryId - 配對條目 ID，傳入 null 可清除
   */
  setEntryId(entryId: string | null): void {
    if (typeof window === 'undefined') {
      return
    }
    if (entryId === null) {
      sessionStorage.removeItem(STORAGE_KEYS.entryId)
    } else {
      sessionStorage.setItem(STORAGE_KEYS.entryId, entryId)
    }
  }

  /**
   * 檢查是否處於線上配對模式
   *
   * @returns 是否有 entryId（線上配對中）
   */
  isMatchmakingMode(): boolean {
    return this.getEntryId() !== null
  }

  /**
   * 清除配對資訊
   */
  clearMatchmaking(): void {
    if (typeof window === 'undefined') {
      return
    }
    sessionStorage.removeItem(STORAGE_KEYS.entryId)
  }

  // === Session Cleanup ===

  /**
   * 清除所有會話資訊
   *
   * @description
   * 離開遊戲時清除所有 sessionStorage 資料（entryId + currentGameId）
   */
  clearSession(): void {
    if (typeof window === 'undefined') {
      return
    }
    sessionStorage.removeItem(STORAGE_KEYS.entryId)
    sessionStorage.removeItem(STORAGE_KEYS.currentGameId)
  }
}

/**
 * 建立 SessionContextAdapter 實例
 *
 * @description
 * 工廠函數，用於 DI 註冊。
 *
 * @returns SessionContextAdapter 實例
 */
export function createSessionContextAdapter(): SessionContextPort {
  return new SessionContextAdapter()
}
