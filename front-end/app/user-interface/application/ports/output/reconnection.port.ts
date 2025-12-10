/**
 * Reconnection Output Port
 *
 * @description
 * 定義重連服務的介面，由 Application Layer 定義，Adapter Layer 實作。
 * 負責協調 SSE 事件清理與遊戲快照獲取等技術細節。
 *
 * 設計原則：
 * - Application Layer 透過此 Port 與重連相關的基礎設施互動
 * - 實作應處理 API 請求、事件清理等技術細節
 * - Use Case 只關心業務邏輯，不關心實作細節
 *
 * @module user-interface/application/ports/output/reconnection.port
 */

import type { GameSnapshotRestore } from '#shared/contracts'

/**
 * ReconnectionPort - Output Port
 *
 * @description
 * 提供重連相關操作的介面。
 * 實作應封裝 EventRouter、Snapshot API 等技術細節。
 */
export abstract class ReconnectionPort {
  /**
   * 獲取遊戲快照
   *
   * @param gameId - 遊戲 ID
   * @returns 遊戲快照，若獲取失敗則返回 null
   *
   * @description
   * 呼叫 `/api/v1/games/{gameId}/snapshot` API 獲取最新遊戲狀態。
   * 實作應處理各種 HTTP 錯誤狀態：
   * - 401: Session 過期
   * - 404: 遊戲不存在
   * - 410: 遊戲已結束
   * - 500: 伺服器錯誤
   */
  abstract fetchSnapshot(gameId: string): Promise<GameSnapshotRestore | null>

  /**
   * 清空事件處理鏈
   *
   * @description
   * 丟棄所有累積的未處理事件。
   * 用於頁面恢復可見或 SSE 重連成功時，
   * 確保不會處理過時的累積事件。
   *
   * 實作應呼叫 EventRouter.clearEventChain()。
   */
  abstract clearPendingEvents(): void
}
