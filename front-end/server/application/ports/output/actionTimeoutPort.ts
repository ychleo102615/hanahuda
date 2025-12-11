/**
 * ActionTimeoutPort - Output Port
 *
 * @description
 * 操作超時管理 Port。
 * Application Layer 透過此 Port 管理遊戲的操作超時。
 * 每個遊戲同時只會有一個計時器（回合制）。
 *
 * @module server/application/ports/output/actionTimeoutPort
 */

/**
 * 操作超時管理 Port
 */
export interface ActionTimeoutPort {
  /**
   * 開始超時計時
   *
   * @param gameId 遊戲 ID
   * @param seconds 超時秒數
   * @param onTimeout 超時回調函數
   */
  startTimeout(gameId: string, seconds: number, onTimeout: () => void): void

  /**
   * 清除指定遊戲的計時器
   *
   * @param gameId 遊戲 ID
   */
  clearTimeout(gameId: string): void

  /**
   * 排程延遲執行
   *
   * @param gameId 遊戲 ID
   * @param delayMs 延遲毫秒數
   * @param callback 回調函數
   */
  scheduleAction(gameId: string, delayMs: number, callback: () => void): void

  /**
   * 取得指定遊戲的剩餘超時秒數
   *
   * @description
   * 用於斷線重連時計算操作的剩餘時間。
   *
   * @param gameId 遊戲 ID
   * @returns 剩餘秒數（無計時器或已過期回傳 null）
   */
  getRemainingSeconds(gameId: string): number | null
}
