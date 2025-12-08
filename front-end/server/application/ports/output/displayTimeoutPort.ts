/**
 * DisplayTimeoutPort - Output Port
 *
 * @description
 * 顯示超時管理 Port。
 * Application Layer 透過此 Port 管理結果畫面的顯示延遲。
 *
 * @module server/application/ports/output/displayTimeoutPort
 */

/**
 * 顯示超時管理 Port
 */
export interface DisplayTimeoutPort {
  /**
   * 開始顯示超時計時
   *
   * @param gameId 遊戲 ID
   * @param seconds 顯示秒數
   * @param onTimeout 超時回調函數（推進遊戲）
   */
  startDisplayTimeout(gameId: string, seconds: number, onTimeout: () => void): void

  /**
   * 清除指定遊戲的顯示計時器
   *
   * @param gameId 遊戲 ID
   */
  clearDisplayTimeout(gameId: string): void

  /**
   * 檢查指定遊戲的計時器是否正在運行
   *
   * @param gameId 遊戲 ID
   * @returns 計時器是否正在運行
   */
  isTimerActive(gameId: string): boolean
}
