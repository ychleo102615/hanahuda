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
   * 保存此 ID 用於建立 WebSocket 連線。
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

  // === Online Matchmaking ===

  /**
   * 設定配對經過秒數
   */
  setElapsedSeconds(seconds: number): void

  /**
   * 取得配對經過秒數
   */
  readonly elapsedSeconds: number

  /**
   * 設定狀態訊息
   */
  setStatusMessage(message: string | null): void

  /**
   * 取得狀態訊息
   */
  readonly statusMessage: string | null

  /**
   * 設定對手資訊 (配對成功後)
   */
  setOpponentInfo(name: string, isBot: boolean): void

  /**
   * 取得對手名稱
   */
  readonly opponentName: string | null

  /**
   * 取得是否為 Bot 對手
   */
  readonly isBot: boolean

  /**
   * 批量設定配對成功狀態
   *
   * @description
   * 使用 Pinia $patch 一次性更新多個屬性，減少響應式更新次數。
   * 解決 iPad 等低端設備上多次響應式更新導致的動畫卡頓問題。
   */
  setMatchedState(payload: MatchedStatePayload): void
}

/**
 * 配對成功狀態 Payload
 */
export interface MatchedStatePayload {
  opponentName: string
  isBot: boolean
  gameId: string
}

/**
 * MatchmakingStatus - 配對狀態列舉
 */
export type MatchmakingStatus =
  | 'idle' // 初始狀態（顯示 "Find Match" 按鈕）
  | 'finding' // 配對中（顯示 "Finding match..." 載入提示）
  | 'waiting' // 等待對手（遊戲已建立，等待對手加入）
  | 'error' // 錯誤狀態（顯示錯誤訊息）
  // === Online Matchmaking (011-online-matchmaking) ===
  | 'searching' // 搜尋對手中 (0-10s)
  | 'low_availability' // 低可用性狀態 (10-15s)
  | 'matched' // 已配對成功
  | 'starting' // 遊戲正在啟動中（已配對，等待發牌）

/**
 * OnlineMatchmakingState - 線上配對狀態
 */
export interface OnlineMatchmakingState {
  /** 配對經過秒數 */
  readonly elapsedSeconds: number
  /** 狀態訊息 */
  readonly statusMessage: string | null
  /** 對手名稱 (配對成功後) */
  readonly opponentName: string | null
  /** 是否為 Bot 對手 */
  readonly isBot: boolean
}
