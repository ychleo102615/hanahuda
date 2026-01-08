/**
 * ClearOrphanedSessionPort - Input Port
 *
 * @description
 * 定義清除孤立會話資訊的介面。
 * 用於進入首頁時清除殘留的配對資訊（roomTypeId、entryId）。
 *
 * 使用場景：
 * - 用戶直接導航到首頁（可能因意外離開 lobby/game 頁面）
 * - 確保首頁不會有殘留的配對狀態
 *
 * @module user-interface/application/ports/input/clear-orphaned-session.port
 */

/**
 * ClearOrphanedSessionPort Input Port
 *
 * @description
 * 如果沒有活躍的遊戲，清除 SessionContext 中的 roomTypeId 和 entryId。
 */
export abstract class ClearOrphanedSessionPort {
  /**
   * 執行清除孤立會話
   *
   * @description
   * 檢查是否有活躍遊戲，若無則清除 sessionContext。
   */
  abstract execute(): void
}
