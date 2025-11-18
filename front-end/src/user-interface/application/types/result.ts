/**
 * Result 型別（用於同步操作的錯誤處理）
 *
 * @description
 * Result 型別採用 Railway-Oriented Programming 模式，
 * 明確表達成功/失敗兩條路徑，避免使用 try-catch。
 *
 * 主要用於：
 * - 同步驗證邏輯（如 PlayHandCardUseCase 的預驗證）
 * - 需要明確錯誤處理的業務流程
 *
 * @template T - 成功時返回的值類型
 * @template E - 失敗時返回的錯誤類型（預設為 string）
 *
 * @example
 * ```typescript
 * function validateCard(cardId: string): Result<boolean> {
 *   if (cardId.length === 0) {
 *     return { success: false, error: 'INVALID_CARD' }
 *   }
 *   return { success: true, value: true }
 * }
 *
 * const result = validateCard('0341')
 * if (result.success) {
 *   console.log('Validation passed:', result.value)
 * } else {
 *   console.error('Validation failed:', result.error)
 * }
 * ```
 */
export type Result<T, E = string> =
  | { success: true; value: T }
  | { success: false; error: E }
