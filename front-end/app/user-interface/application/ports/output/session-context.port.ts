/**
 * SessionContext Output Port
 *
 * @description
 * 定義使用者選擇資訊的存取介面（需跨頁面刷新保留）。
 * 僅儲存使用者主動選擇的資訊：房間類型、配對條目。
 *
 * 不在此介面中管理的資訊：
 * - playerId/playerName: 由 useAuthStore 管理（來自 auth/me API）
 * - gameId: 由 gameState.currentGameId 管理（來自 Gateway 事件）
 * - gameFinished: 由 gameState.gameEnded 管理
 * - session_token: 由 HttpOnly Cookie 管理
 *
 * 設計原則：
 * - 單一真相來源（SSOT）：只存使用者主動選擇的資訊
 * - 非響應式資料：不需要驅動 UI 更新
 * - 跨頁面刷新保留：用於重連、Rematch、取消配對
 *
 * @module user-interface/application/ports/output/session-context.port
 */

/**
 * SessionContext Output Port
 *
 * @description
 * 提供使用者選擇資訊的讀寫介面。
 * 實作應使用 sessionStorage 儲存資料。
 */
export abstract class SessionContextPort {
  // === Room Selection ===

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
   * 檢查是否有房間選擇
   *
   * @returns 是否有 roomTypeId
   *
   * @description
   * 用於路由守衛檢查使用者是否已選擇房間類型。
   */
  abstract hasRoomSelection(): boolean

  // === Online Matchmaking ===

  /**
   * 取得配對條目 ID
   *
   * @returns 配對條目 ID，若無則返回 null
   */
  abstract getEntryId(): string | null

  /**
   * 設定配對條目 ID
   *
   * @param entryId - 配對條目 ID，傳入 null 可清除
   */
  abstract setEntryId(entryId: string | null): void

  /**
   * 檢查是否處於線上配對模式
   *
   * @returns 是否有 entryId（線上配對中）
   */
  abstract isMatchmakingMode(): boolean

  /**
   * 清除配對資訊
   *
   * @description
   * 配對完成或取消時清除 entryId
   */
  abstract clearMatchmaking(): void

  // === Session Cleanup ===

  /**
   * 清除所有會話資訊
   *
   * @description
   * 離開遊戲時清除所有 sessionStorage 資料
   */
  abstract clearSession(): void
}
