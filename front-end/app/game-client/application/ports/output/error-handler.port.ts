/**
 * ErrorHandlerPort - Output Port
 *
 * @description
 * 由 Application Layer 定義，Adapter Layer 實作。
 * 負責統一處理 API 錯誤，根據錯誤類型決定處理策略。
 *
 * 處理策略：
 * - Toast 通知（可恢復錯誤）：400, 409, 429
 * - 重導向（session 失效或遊戲不存在）：401, 403, 404, 410
 * - 錯誤 Modal（伺服器錯誤）：500
 *
 * 使用於：
 * - PlayHandCardUseCase
 * - SelectMatchTargetUseCase
 * - MakeKoiKoiDecisionUseCase
 *
 * @example
 * ```typescript
 * // 在 Use Case 中使用
 * try {
 *   await this.sendCommand.playHandCard(cardId)
 * } catch (error) {
 *   this.errorHandler.handle(error)
 * }
 * ```
 */
export interface ErrorHandlerPort {
  /**
   * 處理錯誤
   *
   * @description
   * 根據錯誤類型決定處理策略：顯示 Toast、重導向或顯示錯誤 Modal。
   * 回傳值表示錯誤是否已處理完畢。
   *
   * @param error - 錯誤物件
   * @returns 是否已處理（true = 呼叫者不需要再處理）
   *
   * @example
   * ```typescript
   * const handled = errorHandler.handle(error)
   * if (!handled) {
   *   console.error('Unhandled error:', error)
   * }
   * ```
   */
  handle(error: unknown): boolean
}
