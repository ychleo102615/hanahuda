/**
 * Display Timeout Manager
 *
 * @description
 * 顯示超時管理器，管理結果畫面的顯示時間。
 * 用於局結束後的延遲，等待前端顯示結果後再推進遊戲。
 *
 * @module server/adapters/timeout/displayTimeoutManager
 */

/**
 * 顯示超時管理器
 *
 * @description
 * 管理結果畫面的顯示時間。
 * 每個 Key（gameId）對應一個計時器。
 *
 * 與 ActionTimeoutManager 的差異：
 * - Key 為 gameId 而非 gameId:playerId
 * - 無需緩衝時間（前端等待伺服器推進）
 */
class DisplayTimeoutManager {
  private timers: Map<string, NodeJS.Timeout> = new Map()

  /**
   * 開始顯示超時計時
   *
   * @param gameId 遊戲 ID
   * @param seconds 顯示秒數
   * @param onTimeout 超時回調函數（推進遊戲）
   */
  startDisplayTimeout(gameId: string, seconds: number, onTimeout: () => void): void {
    this.clearDisplayTimeout(gameId)
    const timer = setTimeout(onTimeout, seconds * 1000)
    this.timers.set(gameId, timer)
    console.log(`[DisplayTimeoutManager] Started display timeout for game ${gameId}: ${seconds}s`)
  }

  /**
   * 清除指定遊戲的顯示計時器
   *
   * @param gameId 遊戲 ID
   */
  clearDisplayTimeout(gameId: string): void {
    const timer = this.timers.get(gameId)
    if (timer) {
      clearTimeout(timer)
      this.timers.delete(gameId)
      console.log(`[DisplayTimeoutManager] Cleared display timeout for game ${gameId}`)
    }
  }

  /**
   * 檢查指定遊戲的計時器是否正在運行
   *
   * @param gameId 遊戲 ID
   * @returns 計時器是否正在運行
   */
  isTimerActive(gameId: string): boolean {
    return this.timers.has(gameId)
  }
}

/**
 * 顯示超時管理器單例
 */
export const displayTimeoutManager = new DisplayTimeoutManager()
