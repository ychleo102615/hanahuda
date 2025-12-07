/**
 * Action Timeout Manager
 *
 * @description
 * 操作超時管理器，管理玩家操作的超時計時。
 * 用於後續 Phase 7 的 autoAction 功能，以及 AI 操作的延遲排程。
 */

/**
 * 計時器 Key 格式: gameId:playerId
 */
type TimerKey = string

/**
 * 操作超時管理器
 *
 * @description
 * 管理玩家操作的超時計時。
 * 每個 Key（gameId:playerId）對應一個計時器。
 */
class ActionTimeoutManager {
  private timers: Map<TimerKey, NodeJS.Timeout> = new Map()

  /**
   * 開始超時計時
   *
   * @param key 計時器 Key（格式: gameId:playerId）
   * @param seconds 超時秒數
   * @param onTimeout 超時回調函數
   */
  startTimeout(key: TimerKey, seconds: number, onTimeout: () => void): void {
    this.clearTimeout(key)
    // +3 秒緩衝，確保 client 端先超時
    const timer = setTimeout(onTimeout, (seconds + 3) * 1000)
    this.timers.set(key, timer)
    console.log(`[ActionTimeoutManager] Started timeout for ${key}: ${seconds + 3}s`)
  }

  /**
   * 清除指定 Key 的計時器
   *
   * @param key 計時器 Key
   */
  clearTimeout(key: TimerKey): void {
    const timer = this.timers.get(key)
    if (timer) {
      clearTimeout(timer)
      this.timers.delete(key)
      console.log(`[ActionTimeoutManager] Cleared timeout for ${key}`)
    }
  }

  /**
   * 清除指定遊戲的所有計時器
   *
   * @param gameId 遊戲 ID
   */
  clearAllForGame(gameId: string): void {
    for (const key of this.timers.keys()) {
      if (key.startsWith(`${gameId}:`)) {
        this.clearTimeout(key)
      }
    }
    console.log(`[ActionTimeoutManager] Cleared all timeouts for game ${gameId}`)
  }

  /**
   * 排程延遲執行
   *
   * @param key 計時器 Key
   * @param delayMs 延遲毫秒數
   * @param callback 回調函數
   */
  scheduleAction(key: TimerKey, delayMs: number, callback: () => void): void {
    this.clearTimeout(key)
    const timer = setTimeout(callback, delayMs)
    this.timers.set(key, timer)
    console.log(`[ActionTimeoutManager] Scheduled action for ${key}: ${delayMs}ms`)
  }
}

/**
 * 操作超時管理器單例
 */
export const actionTimeoutManager = new ActionTimeoutManager()
