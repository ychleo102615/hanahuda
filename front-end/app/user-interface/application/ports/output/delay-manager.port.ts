/**
 * DelayManagerPort - Output Port
 *
 * @description
 * 統一管理所有延遲操作（setTimeout, requestAnimationFrame）。
 * 支援集中式取消，用於重連時清空所有 pending 操作。
 *
 * 設計目的：
 * - 解決重連時 Use Case 中的 setTimeout 無法被取消的問題
 * - 當 cancelAll() 被呼叫時，所有 pending 的延遲都會被中斷
 * - 被取消的 Promise 會 reject DelayAbortedError，Use Case 應該靜默結束
 *
 * @example
 * ```typescript
 * // 在 Use Case 中使用可取消的延遲
 * try {
 *   await this.delayManager.delay(50)
 *   // 繼續執行...
 * } catch (error) {
 *   if (error instanceof DelayAbortedError) {
 *     console.info('Aborted due to state recovery')
 *     return // 靜默結束
 *   }
 *   throw error
 * }
 *
 * // 等待瀏覽器 layout
 * await this.delayManager.waitForLayout()
 *
 * // 重連時取消所有 pending delays
 * this.delayManager.cancelAll()
 * ```
 *
 * @module user-interface/application/ports/output/delay-manager.port
 */
export abstract class DelayManagerPort {
  /**
   * 延遲指定毫秒數
   *
   * @param ms - 延遲毫秒數
   * @returns Promise，完成時 resolve，被取消時 reject DelayAbortedError
   * @throws {DelayAbortedError} 當 cancelAll() 被呼叫時
   */
  abstract delay(ms: number): Promise<void>

  /**
   * 等待瀏覽器完成 layout
   *
   * @param frames - 等待的幀數（預設 1）
   * @returns Promise，完成時 resolve，被取消時 reject DelayAbortedError
   * @throws {DelayAbortedError} 當 cancelAll() 被呼叫時
   *
   * @description
   * 使用 requestAnimationFrame 等待瀏覽器完成 layout 計算。
   * 常用於確保 DOM 變更已反映後再執行後續操作。
   */
  abstract waitForLayout(frames?: number): Promise<void>

  /**
   * 取消所有 pending 的延遲操作
   *
   * @description
   * 清除所有 setTimeout 和 requestAnimationFrame，
   * 並 reject 所有 pending Promise（拋出 DelayAbortedError）。
   * 每次呼叫會遞增 version 號。
   */
  abstract cancelAll(): void

  /**
   * 取得目前版本號
   *
   * @description
   * 每次 cancelAll() 會遞增版本號。
   * Use Case 可用於檢查是否該中斷執行。
   */
  abstract getVersion(): number
}

/**
 * 延遲被取消時拋出的錯誤
 *
 * @description
 * 當 cancelAll() 被呼叫時，所有 pending 的 delay() 和 waitForLayout()
 * 會 reject 此錯誤。Use Case 應該捕獲此錯誤並靜默結束。
 *
 * @example
 * ```typescript
 * try {
 *   await delayManager.delay(100)
 * } catch (error) {
 *   if (error instanceof DelayAbortedError) {
 *     return // 靜默結束，不向上拋出
 *   }
 *   throw error // 其他錯誤向上傳播
 * }
 * ```
 */
export class DelayAbortedError extends Error {
  constructor() {
    super('Delay was aborted')
    this.name = 'DelayAbortedError'
  }
}
