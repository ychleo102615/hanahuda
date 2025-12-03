/**
 * StartGamePort - Input Port
 *
 * @description
 * 啟動遊戲（加入配對或創建遊戲會話）的 Use Case 介面。
 * 由 GameLobby 等 UI 元件調用。
 *
 * 使用於：
 * - GameLobby.vue
 *
 * @example
 * ```typescript
 * // 在 Vue 元件中使用
 * const startGameUseCase = useDependency<StartGamePort>(TOKENS.StartGamePort)
 *
 * try {
 *   await startGameUseCase.execute()
 * } catch (error) {
 *   console.error('Failed to start game:', error)
 * }
 * ```
 */
export interface StartGamePort {
  /**
   * 執行遊戲啟動流程
   *
   * @param sessionToken - 可選的會話 Token（用於重連）
   * @returns Promise<void>
   * @throws 當 API 調用失敗時拋出異常
   *
   * @example
   * ```typescript
   * try {
   *   await startGameUseCase.execute()
   * } catch (error) {
   *   console.error('Failed to start game:', error)
   * }
   * ```
   */
  execute(sessionToken?: string): Promise<void>
}
