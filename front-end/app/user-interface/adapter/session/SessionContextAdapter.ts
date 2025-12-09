/**
 * SessionContext Adapter
 *
 * @description
 * 實作 SessionContextPort，使用 sessionStorage 儲存非敏感的識別資訊。
 * session_token 由 HttpOnly Cookie 管理，不在此模組中。
 *
 * 設計原則：
 * - 單一真相來源（SSOT）：識別資訊只存在 sessionStorage
 * - 非響應式資料：不需要驅動 UI 更新
 * - 跨頁面刷新保留：用於重連功能
 *
 * @module user-interface/adapter/session/SessionContextAdapter
 */

import { SessionContextPort, type SessionIdentity } from '../../application/ports/output/session-context.port'

/**
 * sessionStorage 鍵名常數
 */
const STORAGE_KEYS = {
  gameId: 'game_id',
  playerId: 'player_id',
} as const

/**
 * SessionContext Adapter
 *
 * @description
 * 封裝 sessionStorage 操作，提供型別安全的 session 識別資訊存取。
 */
export class SessionContextAdapter extends SessionContextPort {
  /**
   * 取得遊戲 ID
   *
   * @returns 遊戲 ID，若無則返回 null
   */
  getGameId(): string | null {
    if (typeof window === 'undefined') {
      return null
    }
    return sessionStorage.getItem(STORAGE_KEYS.gameId)
  }

  /**
   * 取得玩家 ID
   *
   * @returns 玩家 ID，若無則返回 null
   */
  getPlayerId(): string | null {
    if (typeof window === 'undefined') {
      return null
    }
    return sessionStorage.getItem(STORAGE_KEYS.playerId)
  }

  /**
   * 設定會話識別資訊
   *
   * @param identity - 會話識別資訊（gameId, playerId）
   */
  setIdentity(identity: SessionIdentity): void {
    if (typeof window === 'undefined') {
      console.warn('[SessionContextAdapter] Cannot set identity on server-side')
      return
    }
    sessionStorage.setItem(STORAGE_KEYS.gameId, identity.gameId)
    sessionStorage.setItem(STORAGE_KEYS.playerId, identity.playerId)
  }

  /**
   * 清除會話識別資訊
   *
   * @description
   * 用於離開遊戲時清除本地儲存的識別資訊。
   * 注意：session_token Cookie 由後端 API 清除。
   */
  clearIdentity(): void {
    if (typeof window === 'undefined') {
      console.warn('[SessionContextAdapter] Cannot clear identity on server-side')
      return
    }
    sessionStorage.removeItem(STORAGE_KEYS.gameId)
    sessionStorage.removeItem(STORAGE_KEYS.playerId)
  }

  /**
   * 檢查是否有活躍的會話
   *
   * @returns 是否有完整的會話識別資訊
   */
  hasActiveSession(): boolean {
    return this.getGameId() !== null && this.getPlayerId() !== null
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
