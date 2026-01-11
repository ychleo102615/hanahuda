/**
 * DelayPort - 延遲工具 Output Port
 *
 * @description
 * 定義在 Application Layer，由 Adapter Layer 實作。
 * 提供支援 AbortSignal 的延遲操作。
 *
 * 主要用途：
 * - 動畫序列中的等待時間
 * - Use Cases 中需要等待的場景（如等待 FLIP 動畫完成）
 *
 * @example
 * ```typescript
 * // HandleTurnProgressAfterSelectionUseCase 中使用
 * await this.delay.delay(350)  // 等待 FLIP 動畫完成
 * ```
 */
export interface DelayPort {
  /**
   * 可取消的延遲
   *
   * @description
   * 返回一個 Promise，在指定時間後 resolve。
   * 若傳入的 AbortSignal 被觸發，Promise 將 reject AbortOperationError。
   *
   * @param ms - 延遲毫秒數
   * @param signal - AbortSignal（可選），用於取消延遲
   * @returns Promise，完成時 resolve，被取消時 reject AbortOperationError
   * @throws {AbortOperationError} 當 AbortSignal 被觸發時
   */
  delay(ms: number, signal?: AbortSignal): Promise<void>
}
