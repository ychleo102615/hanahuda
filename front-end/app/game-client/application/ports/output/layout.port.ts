/**
 * LayoutPort - 瀏覽器 Layout 等待 Output Port
 *
 * @description
 * 定義在 Application Layer，由 Adapter Layer 實作。
 * 提供等待瀏覽器完成 layout 計算的功能。
 *
 * 主要用途：
 * - DOM 更新後等待 layout 計算完成再進行動畫
 * - 確保動畫目標元素的位置已正確計算
 *
 * @example
 * ```typescript
 * // HandleSelectionRequiredUseCase 中使用
 * await this.layout.waitForLayout(1)  // 等待一幀讓 DOM 更新
 * ```
 */
export interface LayoutPort {
  /**
   * 等待瀏覽器完成 layout
   *
   * @description
   * 使用 requestAnimationFrame 等待瀏覽器完成 layout 計算。
   * 可選擇等待多幀以確保複雜的 DOM 更新完成。
   *
   * @param frames - 等待的幀數（預設 1）
   * @param signal - AbortSignal（可選），用於取消等待
   * @returns Promise，完成時 resolve，被取消時 reject AbortOperationError
   * @throws {AbortOperationError} 當 AbortSignal 被觸發時
   */
  waitForLayout(frames?: number, signal?: AbortSignal): Promise<void>
}
