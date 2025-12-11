/**
 * Abort Types - 操作中止相關類型定義
 *
 * @description
 * 定義在 Application Layer，讓 Use Cases 可以 catch。
 * Adapter Layer 的 AbortableDelay 會 import 並拋出此錯誤。
 *
 * @module user-interface/application/types/abort
 */

/**
 * AbortOperationError - 操作被中止時拋出的錯誤
 *
 * @description
 * 當 AbortSignal 被觸發時，所有可取消的操作會拋出此錯誤。
 * Use Cases 應該 catch 此錯誤並靜默結束。
 *
 * @example
 * ```typescript
 * try {
 *   await delay(100, signal)
 * } catch (error) {
 *   if (error instanceof AbortOperationError) {
 *     console.info('Operation aborted')
 *     return  // 靜默結束
 *   }
 *   throw error
 * }
 * ```
 */
export class AbortOperationError extends Error {
  constructor(message = 'Operation was aborted') {
    super(message)
    this.name = 'AbortOperationError'
    // 確保 instanceof 檢查正常運作
    Object.setPrototypeOf(this, AbortOperationError.prototype)
  }
}
