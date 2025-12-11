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

import type { SnapshotApiResponse } from '#shared/contracts'

/**
 * Snapshot API 結果
 *
 * @description
 * 封裝 Snapshot API 的回應結果，包含成功和失敗情況。
 */
/**
 * Snapshot API 錯誤類型
 *
 * - `network_error`: 網路連線失敗
 * - `not_found`: 遊戲不存在（404）或會話過期（401）
 * - `server_error`: 伺服器錯誤（5xx）
 * - `timeout`: 請求超時
 */
export type SnapshotError = 'network_error' | 'not_found' | 'server_error' | 'timeout'

export type SnapshotResult =
  | { success: true; data: SnapshotApiResponse }
  | { success: false; error: SnapshotError }

/**
 * ReconnectionPort - Output Port
 *
 * @description
 * 提供重連相關操作的介面。
 * 實作應封裝 EventRouter、Snapshot API 等技術細節。
 */
export abstract class ReconnectionPort {
  /**
   * 獲取遊戲快照或遊戲狀態
   *
   * @param gameId - 遊戲 ID
   * @returns Snapshot API 結果，包含不同的回應類型：
   *   - `snapshot`: 正常遊戲快照
   *   - `game_finished`: 遊戲已結束（包含最終結果）
   *   - `game_expired`: 遊戲已過期無法恢復
   *
   * @description
   * 呼叫 `/api/v1/games/{gameId}/snapshot` API。
   * 回應類型由後端決定，前端根據 `response_type` 決定行為。
   */
  abstract fetchSnapshot(gameId: string): Promise<SnapshotResult>

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
