/**
 * SessionContext Output Port
 *
 * @description
 * 定義會話資訊的存取介面（需跨頁面刷新保留）。
 * 儲存選擇的房間類型和遊戲 ID，讓頁面刷新後可以恢復狀態。
 *
 * 管理的資訊：
 * - selectedRoomTypeId: 選擇的房間類型（配對中時保留，遊戲開始或取消時清除）
 * - currentGameId: 遊戲 ID（用於頁面刷新後重連）
 *
 * 狀態判斷：
 * - selectedRoomTypeId 存在，currentGameId 不存在 → 配對中（或準備配對）
 * - currentGameId 存在 → 遊戲中
 * - 都不存在 → 閒置
 *
 * 不在此介面中管理的資訊：
 * - roomTypeId: 由 gameState.roomTypeId 管理（來自 WebSocket 事件）
 * - playerId/playerName: 由 useAuthStore 管理（來自 auth/me API）
 * - gameFinished: 由 gameState.gameEnded 管理
 * - session_token: 由 HttpOnly Cookie 管理
 *
 * 設計原則：
 * - 單一真相來源（SSOT）
 * - 非響應式資料：不需要驅動 UI 更新
 * - 跨頁面刷新保留：用於重連遊戲
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

  // === Selected Room (Matchmaking) ===

  /**
   * 取得選擇的房間類型
   *
   * @description
   * 用於表示玩家選擇的房間類型，在整個配對過程中保留。
   * - Lobby 點擊房間後設定
   * - 配對中時保留（頁面刷新後可恢復）
   * - 遊戲開始或取消配對時清除
   *
   * @returns 房間類型 ID，若無則返回 null
   */
  abstract getSelectedRoomTypeId(): RoomTypeId | null

  /**
   * 設定選擇的房間類型
   *
   * @param roomTypeId - 房間類型 ID，傳入 null 可清除
   */
  abstract setSelectedRoomTypeId(roomTypeId: RoomTypeId | null): void

  /**
   * 檢查是否有選擇的房間（配對中或準備配對）
   *
   * @returns 是否有 selectedRoomTypeId
   */
  abstract hasSelectedRoom(): boolean

  // === Session Cleanup ===

  /**
   * 清除所有會話資訊
   *
   * @description
   * 離開遊戲時清除所有 sessionStorage 資料（selectedRoomTypeId + currentGameId）
   */
  abstract clearSession(): void
}
