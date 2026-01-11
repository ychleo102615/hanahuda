/**
 * OperationSessionManager - 操作會話管理器
 *
 * @description
 * 管理全域的 AbortController，用於協調所有可取消操作。
 * 當需要中斷所有進行中的操作時（如重連），呼叫 abortAll()。
 *
 * 設計原則：
 * - 單例模式：整個應用只有一個實例
 * - 符合 Web 標準：使用 AbortController/AbortSignal
 * - Adapter Layer 內部服務：提供給 Use Cases 和其他 Adapters 使用
 *
 * @example
 * ```typescript
 * const sessionManager = new OperationSessionManager()
 *
 * // 遊戲開始時建立新會話
 * const signal = sessionManager.createNewSession()
 *
 * // 在可取消操作中使用 signal
 * await delay(100, sessionManager.getSignal())
 *
 * // 重連時中斷所有操作
 * sessionManager.abortAll()
 * ```
 *
 * @module game-client/adapter/abort/OperationSessionManager
 */

export class OperationSessionManager {
  /**
   * 當前的 AbortController
   * @private
   */
  private currentController: AbortController

  constructor() {
    // 初始化時就建立 controller，確保 getSignal() 永遠返回有效的 signal
    this.currentController = new AbortController()
  }

  /**
   * 建立新的操作會話
   *
   * @description
   * 每次遊戲開始或重連成功後呼叫。
   * 會先中止舊的會話，再建立新的。
   *
   * @returns 新會話的 AbortSignal
   */
  createNewSession(): AbortSignal {
    // 先中止舊會話
    if (this.currentController) {
      this.currentController.abort()
    }

    this.currentController = new AbortController()
    return this.currentController.signal
  }

  /**
   * 取得當前會話的 AbortSignal
   *
   * @returns 當前的 AbortSignal（永遠有效）
   */
  getSignal(): AbortSignal {
    return this.currentController.signal
  }

  /**
   * 中止所有進行中的操作
   *
   * @description
   * 用於重連時中斷所有 pending 的 delay、動畫、網路請求。
   * 所有使用此 signal 的 Promise 都會 reject AbortOperationError。
   *
   * 重要：中止後會立即創建新的 session，確保後續操作可以獲取有效的 signal。
   */
  abortAll(): void {
    if (this.currentController) {
      this.currentController.abort()
    }
    // 立即創建新的 session，確保後續操作有有效的 signal
    this.currentController = new AbortController()
  }

  /**
   * 檢查當前會話是否已中止
   *
   * @returns true 如果已中止
   */
  isAborted(): boolean {
    return this.currentController.signal.aborted
  }

  /**
   * 檢查是否有活躍的會話
   *
   * @returns true 如果有活躍且未中止的會話
   */
  hasActiveSession(): boolean {
    return !this.currentController.signal.aborted
  }
}
