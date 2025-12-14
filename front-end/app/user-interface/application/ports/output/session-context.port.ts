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
  /** 玩家 ID */
  playerId: string
  /** 玩家名稱（可選） */
  playerName?: string
  /** 遊戲 ID（可選，新遊戲時無） */
  gameId?: string
  /** 房間類型 ID（可選） */
  roomTypeId?: string
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
   * 設定遊戲 ID
   *
   * @param gameId - 遊戲 ID，傳入 null 可清除
   *
   * @description
   * 用於 SSE 連線後收到 InitialState 時設定遊戲 ID，
   * 或遊戲結束/過期時清除遊戲 ID。
   */
  abstract setGameId(gameId: string | null): void

  /**
   * 取得玩家 ID
   *
   * @returns 玩家 ID，若無則返回 null
   */
  abstract getPlayerId(): string | null

  /**
   * 取得玩家名稱
   *
   * @returns 玩家名稱，若無則返回 null
   */
  abstract getPlayerName(): string | null

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
   * @returns 是否有完整的會話識別資訊（playerId 和 gameId）
   */
  abstract hasActiveSession(): boolean

  /**
   * 取得房間類型 ID
   *
   * @returns 房間類型 ID，若無則返回 null
   */
  abstract getRoomTypeId(): string | null

  /**
   * 設定房間類型 ID
   *
   * @param roomTypeId - 房間類型 ID，傳入 null 可清除
   */
  abstract setRoomTypeId(roomTypeId: string | null): void

  /**
   * 檢查是否有房間選擇資訊
   *
   * @returns 是否有 playerId 和 roomTypeId
   *
   * @description
   * 用於 SSE-First 架構下的路由守衛。
   * 新遊戲時只有 playerId 和 roomTypeId，gameId 要等 SSE 連線後才會設定。
   */
  abstract hasRoomSelection(): boolean
}
