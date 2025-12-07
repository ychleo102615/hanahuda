/**
 * ActionTimeoutPort - Output Port
 *
 * @description
 * 操作超時管理 Port。
 * Application Layer 透過此 Port 管理玩家操作超時。
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
   * @param key 計時器 Key（格式: gameId:playerId）
   * @param seconds 超時秒數
   * @param onTimeout 超時回調函數
   */
  startTimeout(key: string, seconds: number, onTimeout: () => void): void

  /**
   * 清除指定 Key 的計時器
   *
   * @param key 計時器 Key
   */
  clearTimeout(key: string): void

  /**
   * 清除指定遊戲的所有計時器
   *
   * @param gameId 遊戲 ID
   */
  clearAllForGame(gameId: string): void

  /**
   * 排程延遲執行
   *
   * @param key 計時器 Key
   * @param delayMs 延遲毫秒數
   * @param callback 回調函數
   */
  scheduleAction(key: string, delayMs: number, callback: () => void): void
}
