/**
 * TriggerStateRecoveryPort - Input Port
 *
 * @description
 * 定義「觸發狀態恢復」的介面。
 * 用於頁面恢復可見或 SSE 重連成功時，主動觸發狀態同步。
 *
 * 業務流程：
 * 1. 清空累積的事件隊列（丟棄過時事件）
 * 2. 獲取遊戲快照（最新狀態）
 * 3. 委派 HandleReconnectionUseCase 執行狀態恢復
 *
 * 實作: TriggerStateRecoveryUseCase
 *
 * @example
 * ```typescript
 * // 在頁面恢復可見時觸發
 * document.addEventListener('visibilitychange', () => {
 *   if (!document.hidden && gameId) {
 *     triggerStateRecoveryPort.execute(gameId)
 *   }
 * })
 * ```
 */
export abstract class TriggerStateRecoveryPort {
  /**
   * 觸發狀態恢復流程
   *
   * @param gameId - 遊戲 ID
   * @returns Promise<void> - 狀態恢復完成後 resolve
   *
   * @throws 當 snapshot API 請求失敗時，會顯示錯誤訊息但不拋出異常
   */
  abstract execute(gameId: string): Promise<void>
}
