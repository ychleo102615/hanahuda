/**
 * SessionContext Output Port
 *
 * @description
 * 定義會話資訊的存取介面（需跨頁面刷新保留）。
 * 儲存配對條目 ID 和遊戲 ID，讓頁面刷新後可以恢復遊戲。
 *
 * 管理的資訊：
 * - entryId: 配對條目 ID（用於取消配對）
 * - currentGameId: 遊戲 ID（用於頁面刷新後重連）
 * - pendingRoomTypeId: 待配對的房間類型（用於 Lobby → Game 頁面傳遞）
 *
 * 不在此介面中管理的資訊：
 * - roomTypeId: 由 gameState.roomTypeId 管理（來自 SSE 事件）
 * - playerId/playerName: 由 useAuthStore 管理（來自 auth/me API）
 * - gameFinished: 由 gameState.gameEnded 管理
 * - session_token: 由 HttpOnly Cookie 管理
 *
 * 設計原則：
 * - 單一真相來源（SSOT）
 * - 非響應式資料：不需要驅動 UI 更新
 * - 跨頁面刷新保留：用於重連遊戲和取消配對
 *
 * @module game-client/application/ports/output/session-context.port
 */

import type { RoomTypeId } from '~~/shared/constants/roomTypes'

/**
 * SessionContext Output Port
 *
 * @description
 * 提供配對相關資訊的讀寫介面。
 * 實作應使用 sessionStorage 儲存資料。
 */
export abstract class SessionContextPort {
  // === Game Session ===

  /**
   * 取得當前遊戲 ID
   *
   * @returns 遊戲 ID，若無則返回 null
   */
  abstract getCurrentGameId(): string | null

  /**
   * 設定當前遊戲 ID
   *
   * @param gameId - 遊戲 ID，傳入 null 可清除
   */
  abstract setCurrentGameId(gameId: string | null): void

  /**
   * 檢查是否有進行中的遊戲
   *
   * @returns 是否有 currentGameId
   */
  abstract hasActiveGame(): boolean

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

  // === Pending Matchmaking ===

  /**
   * 取得待配對的房間類型
   *
   * @description
   * 用於 Lobby → Game 頁面傳遞房間類型。
   * Lobby 點擊房間後設定，Game 頁面連線後讀取並發送配對命令。
   *
   * @returns 房間類型 ID，若無則返回 null
   */
  abstract getPendingRoomTypeId(): RoomTypeId | null

  /**
   * 設定待配對的房間類型
   *
   * @param roomTypeId - 房間類型 ID，傳入 null 可清除
   */
  abstract setPendingRoomTypeId(roomTypeId: RoomTypeId | null): void

  // === Session Cleanup ===

  /**
   * 清除所有會話資訊
   *
   * @description
   * 離開遊戲時清除所有 sessionStorage 資料（entryId + currentGameId）
   */
  abstract clearSession(): void
}
