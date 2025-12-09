/**
 * SessionContext Output Port
 *
 * @description
 * 定義遊戲會話識別資訊的存取介面。
 * 管理非敏感的識別資訊（gameId、playerId），
 * session_token 由 HttpOnly Cookie 管理，不在此介面中。
 *
 * 設計原則：
 * - 單一真相來源（SSOT）：識別資訊只存在 sessionStorage
 * - 非響應式資料：不需要驅動 UI 更新
 * - 跨頁面刷新保留：用於重連功能
 *
 * @module user-interface/application/ports/output/session-context.port
 */

/**
 * 非敏感的遊戲會話識別資訊
 *
 * @note session_token 由 HttpOnly Cookie 管理，不在此介面中
 */
export interface SessionIdentity {
  /** 遊戲 ID */
  gameId: string
  /** 玩家 ID */
  playerId: string
}

/**
 * SessionContext Output Port
 *
 * @description
 * 提供遊戲會話識別資訊的讀寫介面。
 * 實作應使用 sessionStorage 儲存資料。
 */
export abstract class SessionContextPort {
  /**
   * 取得遊戲 ID
   *
   * @returns 遊戲 ID，若無則返回 null
   */
  abstract getGameId(): string | null

  /**
   * 取得玩家 ID
   *
   * @returns 玩家 ID，若無則返回 null
   */
  abstract getPlayerId(): string | null

  /**
   * 設定會話識別資訊
   *
   * @param identity - 會話識別資訊
   */
  abstract setIdentity(identity: SessionIdentity): void

  /**
   * 清除會話識別資訊
   *
   * @description
   * 用於離開遊戲時清除本地儲存的識別資訊
   */
  abstract clearIdentity(): void

  /**
   * 檢查是否有活躍的會話
   *
   * @returns 是否有完整的會話識別資訊
   */
  abstract hasActiveSession(): boolean
}
