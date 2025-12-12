/**
 * MatchmakingStatePort - Output Port
 *
 * @description
 * 由 Application Layer 定義，Adapter Layer 實作。
 * 負責管理配對階段的 UI 狀態（大廳畫面）。
 *
 * 與 GameStatePort 的區別：
 * - MatchmakingStatePort: 遊戲會話建立前的配對狀態
 * - GameStatePort: 遊戲會話建立後的遊戲狀態
 *
 * 生命週期：
 * - 建立: 進入 /lobby 路由時
 * - 銷毀: GameStarted 事件後（進入 /game）
 */
export interface MatchmakingStatePort {
  /**
   * 設定配對狀態
   *
   * @param status - 配對狀態
   *
   * @example
   * ```typescript
   * matchmakingState.setStatus('finding') // 配對中
   * matchmakingState.setStatus('error')   // 錯誤
   * matchmakingState.setStatus('idle')    // 重置為初始狀態
   * ```
   */
  setStatus(status: MatchmakingStatus): void

  /**
   * 設定會話 Token
   *
   * @param token - 會話 Token，清除時傳入 null
   *
   * @description
   * GameRequestJoin 成功後，伺服器返回 session_token。
   * 保存此 token 用於後續遊戲會話識別。
   *
   * @example
   * ```typescript
   * matchmakingState.setSessionToken('session-abc123')
   * matchmakingState.setSessionToken(null) // 清除
   * ```
   */
  setSessionToken(token: string | null): void

  /**
   * 取得會話 Token
   */
  readonly sessionToken: string | null

  /**
   * 設定遊戲 ID
   *
   * @param gameId - 遊戲 ID，清除時傳入 null
   *
   * @description
   * GameRequestJoin 成功後，伺服器返回 game_id。
   * 保存此 ID 用於建立 SSE 連線。
   */
  setGameId(gameId: string | null): void

  /**
   * 取得遊戲 ID
   */
  readonly gameId: string | null

  /**
   * 設定錯誤訊息
   *
   * @param message - 錯誤訊息，清除時傳入 null
   *
   * @example
   * ```typescript
   * matchmakingState.setErrorMessage('Matchmaking timeout, please retry')
   * matchmakingState.setErrorMessage(null) // 清除錯誤
   * ```
   */
  setErrorMessage(message: string | null): void

  /**
   * 清除會話狀態
   *
   * @description
   * 重置所有配對相關狀態：
   * - status → 'idle'
   * - sessionToken → null
   * - errorMessage → null
   *
   * 使用時機：
   * - 返回首頁時
   * - 不可恢復的錯誤發生時
   *
   * @example
   * ```typescript
   * matchmakingState.clearSession()
   * ```
   */
  clearSession(): void
}

/**
 * MatchmakingStatus - 配對狀態列舉
 */
export type MatchmakingStatus =
  | 'idle' // 初始狀態（顯示 "Find Match" 按鈕）
  | 'finding' // 配對中（顯示 "Finding match..." 載入提示）
  | 'waiting' // 等待對手（遊戲已建立，等待對手加入）
  | 'error' // 錯誤狀態（顯示錯誤訊息）
