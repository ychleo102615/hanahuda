/**
 * StartGamePort - Input Port
 *
 * @description
 * 啟動遊戲連線的 Use Case 介面。
 * 由 Game Page 和 GameFinishedModal 調用。
 *
 * Gateway Architecture：
 * - 連線建立後，後端透過 GatewayConnected 事件返回玩家狀態（IDLE/MATCHMAKING/IN_GAME）
 * - playerId、playerName 由呼叫端提供（來自 authStore）
 * - roomTypeId 從 SessionContext 取得
 * - 調用者需提供必要資訊
 *
 * @example
 * ```typescript
 * // Game Page - 進入遊戲頁面時
 * startGameUseCase.execute({
 *   playerId: authStore.playerId,
 *   playerName: authStore.displayName
 * })
 *
 * // GameFinishedModal - 開始新遊戲
 * startGameUseCase.execute({
 *   playerId: authStore.playerId,
 *   playerName: authStore.displayName,
 *   isNewGame: true
 * })
 * ```
 */

/**
 * StartGameOptions - 啟動遊戲選項
 */
export interface StartGameOptions {
  /**
   * 玩家 ID（必填）
   *
   * @description
   * 由呼叫端從 authStore 取得並傳入。
   */
  playerId: string

  /**
   * 玩家名稱
   *
   * @description
   * 由呼叫端從 authStore 取得並傳入。
   *
   * @default 'Player'
   */
  playerName?: string

  /**
   * 是否開始新遊戲
   *
   * @description
   * 設為 true 時會清除 gameState 中的 currentGameId，
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
   * 1. 如果 isNewGame 為 true，清除 currentGameId
   * 2. 斷開現有連線
   * 3. 中斷進行中的操作和動畫
   * 4. 重置遊戲狀態和 UI 狀態
   * 5. 建立新的遊戲連線
   *
   * @param options - 啟動選項（必須包含 playerId）
   *
   * @example
   * ```typescript
   * // 進入遊戲頁面（可能是新遊戲或重連）
   * startGameUseCase.execute({
   *   playerId: authStore.playerId,
   *   playerName: authStore.displayName
   * })
   *
   * // 明確開始新遊戲
   * startGameUseCase.execute({
   *   playerId: authStore.playerId,
   *   playerName: authStore.displayName,
   *   isNewGame: true
   * })
   * ```
   */
  execute(options: StartGameOptions): void
}
