/**
 * OperationSessionPort - 操作會話管理 Output Port
 *
 * @description
 * 定義在 Application Layer，由 Adapter Layer 實作。
 * 管理全域的操作會話，提供 AbortSignal 支援可取消操作。
 *
 * 主要用途：
 * - 在重新連線或開始新遊戲時中斷所有進行中的操作
 * - 為動畫、延遲等長時間操作提供取消信號
 *
 * @example
 * ```typescript
 * // StartGameUseCase 中使用
 * this.operationSession.abortAll()
 *
 * // 動畫中使用
 * const signal = this.operationSession.getSignal()
 * await animateWithSignal(signal)
 * ```
 */
export interface OperationSessionPort {
  /**
   * 建立新的操作會話
   *
   * @description
   * 中斷當前會話並建立新的會話。
   * 所有持有舊 signal 的操作將被取消。
   *
   * @returns 新會話的 AbortSignal
   */
  createNewSession(): AbortSignal

  /**
   * 取得當前會話的 AbortSignal
   *
   * @description
   * 返回當前會話的 signal，用於傳遞給需要支援取消的操作。
   *
   * @returns 當前的 AbortSignal（永遠有效）
   */
  getSignal(): AbortSignal

  /**
   * 中止所有進行中的操作
   *
   * @description
   * 觸發當前會話的 abort，導致所有使用此 signal 的操作被取消。
   * 並建立新的會話以供後續操作使用。
   */
  abortAll(): void

  /**
   * 檢查當前會話是否已中止
   *
   * @returns true 如果當前會話已被 abort
   */
  isAborted(): boolean

  /**
   * 檢查是否有活躍的會話
   *
   * @returns true 如果有活躍且未中止的會話
   */
  hasActiveSession(): boolean
}
