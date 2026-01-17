/**
 * GameConnectionPort - Output Port
 *
 * @description
 * 遊戲連線管理的 Application Layer 介面。
 * 抽象化 WebSocket 連線細節，讓 Use Case 不依賴具體連線技術。
 *
 * 由 Application Layer 定義，Adapter Layer 實作。
 *
 * 使用於：
 * - StartGameUseCase（建立/重新建立遊戲連線）
 *
 * @example
 * ```typescript
 * // 在 Use Case 中使用
 * if (this.gameConnection.isConnected()) {
 *   this.gameConnection.disconnect()
 * }
 * this.gameConnection.connect({
 *   playerId: 'player-1',
 *   playerName: 'Alice',
 *   roomTypeId: 'QUICK',
 * })
 * ```
 */

/**
 * 遊戲連線參數
 */
export interface GameConnectionParams {
  /** 玩家 ID */
  playerId: string
  /** 玩家名稱 */
  playerName: string
  /** 遊戲 ID（重連時使用） */
  gameId?: string
  /** 房間類型 ID */
  roomTypeId?: string
}

/**
 * GameConnectionPort 抽象類別
 *
 * @description
 * 使用 abstract class 而非 interface，防止 duck typing。
 */
export abstract class GameConnectionPort {
  /**
   * 建立遊戲連線
   *
   * @param params - 連線參數
   *
   * @example
   * ```typescript
   * gameConnection.connect({
   *   playerId: 'player-1',
   *   playerName: 'Alice',
   *   roomTypeId: 'QUICK',
   * })
   * ```
   */
  abstract connect(params: GameConnectionParams): void

  /**
   * 斷開遊戲連線
   *
   * @example
   * ```typescript
   * gameConnection.disconnect()
   * ```
   */
  abstract disconnect(): void

  /**
   * 檢查是否已連線
   *
   * @returns 是否已連線
   *
   * @example
   * ```typescript
   * if (gameConnection.isConnected()) {
   *   gameConnection.disconnect()
   * }
   * ```
   */
  abstract isConnected(): boolean

  /**
   * 設定預期斷線標記
   *
   * @description
   * 當遊戲正常結束時，後端會主動關閉 WebSocket 連線。
   * 前端收到 GameFinished 事件後設置此標記，
   * 讓 onclose 處理器知道這是預期中的斷線，不需要嘗試重連。
   *
   * @param expecting - 是否預期即將斷線
   *
   * @example
   * ```typescript
   * // 在 HandleGameFinishedUseCase 中
   * gameConnection.setExpectingDisconnect(true)
   * ```
   */
  abstract setExpectingDisconnect(expecting: boolean): void
}
