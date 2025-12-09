/**
 * StartGameRequest - 啟動遊戲請求參數
 */
export interface StartGameRequest {
  /** 玩家 ID (UUID) */
  playerId: string
  /** 玩家名稱 */
  playerName: string
  /** 可選的會話 Token（用於重連） */
  sessionToken?: string
}

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
 *   await startGameUseCase.execute({ playerId: 'uuid', playerName: 'Player 1' })
 * } catch (error) {
 *   console.error('Failed to start game:', error)
 * }
 * ```
 */
export interface StartGamePort {
  /**
   * 執行遊戲啟動流程
   *
   * @param request - 啟動遊戲請求（包含 playerId, playerName, 可選 sessionToken）
   * @returns Promise<void>
   * @throws 當 API 調用失敗時拋出異常
   *
   * @example
   * ```typescript
   * try {
   *   await startGameUseCase.execute({ playerId: 'uuid', playerName: 'Player 1' })
   * } catch (error) {
   *   console.error('Failed to start game:', error)
   * }
   * ```
   */
  execute(request: StartGameRequest): Promise<void>
}
