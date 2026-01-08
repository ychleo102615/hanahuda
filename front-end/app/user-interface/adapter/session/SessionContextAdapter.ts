/**
 * SessionContext Adapter
 *
 * @description
 * 實作 SessionContextPort，使用 sessionStorage 儲存使用者選擇資訊。
 *
 * 僅儲存需跨頁面刷新保留的使用者選擇：
 * - roomTypeId: 房間類型選擇（用於 Rematch）
 * - entryId: 配對條目 ID（用於取消配對）
 *
 * 不在此模組中管理的資訊：
 * - playerId/playerName: 由 useAuthStore 管理（來自 auth/me API）
 * - gameId: 由 gameState.currentGameId 管理（來自 Gateway 事件）
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
  roomTypeId: 'room_type_id',
  entryId: 'matchmaking_entry_id',
} as const

/**
 * SessionContext Adapter
 *
 * @description
 * 封裝 sessionStorage 操作，提供型別安全的 session 資訊存取。
 */
export class SessionContextAdapter extends SessionContextPort {
  // === Room Selection ===

  /**
   * 取得房間類型 ID
   *
   * @returns 房間類型 ID，若無則返回 null
   */
  getRoomTypeId(): string | null {
    if (typeof window === 'undefined') {
      return null
    }
    return sessionStorage.getItem(STORAGE_KEYS.roomTypeId)
  }

  /**
   * 設定房間類型 ID
   *
   * @param roomTypeId - 房間類型 ID，傳入 null 可清除
   */
  setRoomTypeId(roomTypeId: string | null): void {
    if (typeof window === 'undefined') {
      return
    }
    if (roomTypeId === null) {
      sessionStorage.removeItem(STORAGE_KEYS.roomTypeId)
    } else {
      sessionStorage.setItem(STORAGE_KEYS.roomTypeId, roomTypeId)
    }
  }

  /**
   * 檢查是否有房間選擇
   *
   * @returns 是否有 roomTypeId
   */
  hasRoomSelection(): boolean {
    return this.getRoomTypeId() !== null
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
   * 離開遊戲時清除所有 sessionStorage 資料
   */
  clearSession(): void {
    if (typeof window === 'undefined') {
      return
    }
    sessionStorage.removeItem(STORAGE_KEYS.roomTypeId)
    sessionStorage.removeItem(STORAGE_KEYS.entryId)
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
