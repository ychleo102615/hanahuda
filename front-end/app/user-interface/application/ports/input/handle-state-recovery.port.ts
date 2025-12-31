/**
 * HandleStateRecoveryPort - Input Port
 *
 * @description
 * 統一處理遊戲狀態恢復。
 * 支援四種情境：正常快照恢復、遊戲已結束、遊戲已過期、快照獲取失敗。
 *
 * 使用者：
 * - TriggerStateRecoveryUseCase（主動請求快照後）
 * - SSE GameSnapshotRestore 事件處理（被動接收）
 *
 * 設計原則：
 * - 使用情境不同（主動請求 vs 被動接收），但本質相同（透過快照同步遊戲狀態）
 * - 統一介面處理所有重連相關的狀態恢復
 *
 * @example
 * ```typescript
 * // TriggerStateRecoveryUseCase 中使用
 * const result = await reconnectionPort.fetchSnapshot(gameId)
 * if (result.success) {
 *   switch (result.data.response_type) {
 *     case 'snapshot':
 *       handleStateRecovery.handleSnapshotRestore(result.data.data)
 *       break
 *     case 'game_finished':
 *       handleStateRecovery.handleGameFinished(result.data.data)
 *       break
 *     case 'game_expired':
 *       handleStateRecovery.handleGameExpired()
 *       break
 *   }
 * } else {
 *   handleStateRecovery.handleFetchFailed(result.error)
 * }
 *
 * // SSE 事件處理器中使用
 * handleStateRecovery.handleSnapshotRestore(snapshot)
 * ```
 *
 * @module user-interface/application/ports/input/handle-state-recovery.port
 */

import type { GameSnapshotRestore, GameFinishedInfo } from '#shared/contracts'

/**
 * 快照獲取錯誤類型
 */
export type SnapshotError = 'network_error' | 'timeout' | 'server_error' | 'not_found'

/**
 * HandleStateRecoveryPort - Input Port
 *
 * @description
 * 由 Application Layer 定義，由 Use Case 實作。
 * 統一處理所有重連相關的狀態恢復邏輯。
 */
export abstract class HandleStateRecoveryPort {
  /**
   * 處理正常快照恢復
   *
   * @param snapshot - 遊戲狀態快照
   *
   * @description
   * 用於 SSE 收到 GameSnapshotRestore 事件，或 TriggerStateRecovery 獲取到快照時。
   * 執行：
   * 1. 中斷所有動畫
   * 2. 清除配對狀態
   * 3. 重置並恢復遊戲狀態
   * 4. 隱藏重連訊息
   * 5. 啟動操作倒數
   */
  abstract handleSnapshotRestore(snapshot: GameSnapshotRestore): void

  /**
   * 處理遊戲已結束
   *
   * @param result - 遊戲結束資訊（勝者、最終分數等）
   *
   * @description
   * 用於重連時發現遊戲已結束的情況。
   * 執行：
   * 1. 顯示遊戲結果訊息
   * 2. 導航回大廳
   */
  abstract handleGameFinished(result: GameFinishedInfo): void

  /**
   * 處理遊戲已過期
   *
   * @description
   * 用於重連時發現遊戲已過期（在 DB 但不在記憶體）的情況。
   * 執行：
   * 1. 顯示錯誤訊息
   * 2. 導航回大廳
   */
  abstract handleGameExpired(): void

  /**
   * 處理快照獲取失敗
   *
   * @param error - 錯誤類型
   *
   * @description
   * 用於快照 API 呼叫失敗的情況。
   * 執行：
   * 1. 顯示錯誤訊息
   * 2. 導航回大廳
   */
  abstract handleFetchFailed(error: SnapshotError): void
}
