/**
 * StartGamePort - Input Port
 *
 * @description
 * 啟動遊戲連線的 Use Case 介面。
 * 由 Game Page 和 GameFinishedModal 調用。
 *
 * SSE-First Architecture：
 * - 連線建立後，後端透過 InitialState 事件決定遊戲狀態
 * - playerId、playerName、roomTypeId 從 SessionContext 取得
 * - 調用者只需表達業務意圖（是否新遊戲）
 *
 * @example
 * ```typescript
 * // Game Page - 進入遊戲頁面時
 * startGameUseCase.execute()
 *
 * // GameFinishedModal - 開始新遊戲
 * startGameUseCase.execute({ isNewGame: true })
 * ```
 */

/**
 * StartGameOptions - 啟動遊戲選項
 */
export interface StartGameOptions {
  /**
   * 是否開始新遊戲
   *
   * @description
   * 設為 true 時會清除 SessionContext 中的 gameId，
   * 讓後端知道這是新遊戲請求而非重連。
   *
   * @default false
   */
  isNewGame?: boolean
}

/**
 * StartGamePort 介面
 */
export interface StartGamePort {
  /**
   * 執行遊戲啟動流程
   *
   * @description
   * 1. 如果 isNewGame 為 true，清除 gameId
   * 2. 重置遊戲狀態和 UI 狀態
   * 3. 斷開現有連線（如果有）
   * 4. 建立新的遊戲連線
   *
   * @param options - 啟動選項
   * @throws Error 當 SessionContext 中沒有 playerId 時
   *
   * @example
   * ```typescript
   * // 進入遊戲頁面（可能是新遊戲或重連）
   * startGameUseCase.execute()
   *
   * // 明確開始新遊戲
   * startGameUseCase.execute({ isNewGame: true })
   * ```
   */
  execute(options?: StartGameOptions): void
}
