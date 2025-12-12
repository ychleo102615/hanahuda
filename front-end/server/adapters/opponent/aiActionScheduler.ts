/**
 * AI Action Scheduler - Opponent BC
 *
 * @description
 * AI 操作排程器，專屬於 Opponent BC。
 * 管理 AI 的延遲操作計時器，與 CoreGame 的超時機制完全獨立。
 *
 * @module server/adapters/opponent/aiActionScheduler
 */

/**
 * AI 操作排程器
 *
 * @description
 * 每個遊戲最多一個 AI 計時器。
 * 新的排程會取消之前的計時器。
 */
class AiActionScheduler {
  /** gameId -> timerId */
  private timers: Map<string, NodeJS.Timeout> = new Map()

  /**
   * 排程延遲執行
   *
   * @param gameId 遊戲 ID
   * @param delayMs 延遲毫秒數
   * @param callback 回調函數
   */
  schedule(gameId: string, delayMs: number, callback: () => void): void {
    this.cancel(gameId)

    const timerId = setTimeout(callback, delayMs)
    this.timers.set(gameId, timerId)

    console.log(`[AiActionScheduler] Scheduled action for game ${gameId}: ${delayMs}ms`)
  }

  /**
   * 取消指定遊戲的計時器
   *
   * @param gameId 遊戲 ID
   */
  cancel(gameId: string): void {
    const timerId = this.timers.get(gameId)
    if (timerId) {
      clearTimeout(timerId)
      this.timers.delete(gameId)
      console.log(`[AiActionScheduler] Cancelled action for game ${gameId}`)
    }
  }
}

/**
 * AI 操作排程器單例
 */
export const aiActionScheduler = new AiActionScheduler()
