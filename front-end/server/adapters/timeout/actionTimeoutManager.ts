/**
 * Action Timeout Manager
 *
 * @description
 * 操作超時管理器，管理遊戲的操作超時計時。
 * 每個遊戲同時只會有一個操作超時計時器（回合制）。
 *
 * 職責：
 * - 管理遊戲層級的操作超時
 * - 追蹤計時器開始時間，用於計算剩餘秒數（斷線重連使用）
 * - 排程延遲執行（AI 操作延遲）
 */

/**
 * 伺服器端超時緩衝秒數
 *
 * @description
 * 伺服器端計時器會比客戶端多等待此秒數，確保客戶端先觸發超時。
 * 避免因網路延遲導致伺服器比客戶端先判定超時。
 */
const SERVER_TIMEOUT_BUFFER_SECONDS = 1.5

/**
 * 計時器資訊
 */
interface TimerInfo {
  /** setTimeout ID */
  timerId: NodeJS.Timeout
  /** 計時器開始時間（Unix timestamp in ms） */
  startedAt: number
  /** 原始超時秒數 */
  totalSeconds: number
}

/**
 * 操作超時管理器
 *
 * @description
 * 管理遊戲的操作超時計時。
 * 以 gameId 作為 key，每個遊戲最多一個計時器。
 */
class ActionTimeoutManager {
  private timers: Map<string, TimerInfo> = new Map()

  /**
   * 取得伺服器端超時緩衝秒數
   */
  private getBufferSeconds(): number {
    return SERVER_TIMEOUT_BUFFER_SECONDS
  }

  /**
   * 開始超時計時
   *
   * @param gameId 遊戲 ID
   * @param seconds 超時秒數
   * @param onTimeout 超時回調函數
   */
  startTimeout(gameId: string, seconds: number, onTimeout: () => void): void {
    this.clearTimeout(gameId)
    const bufferSeconds = this.getBufferSeconds()
    const totalMs = (seconds + bufferSeconds) * 1000
    const timerId = setTimeout(onTimeout, totalMs)
    this.timers.set(gameId, {
      timerId,
      startedAt: Date.now(),
      totalSeconds: seconds,
    })
    console.log(`[ActionTimeoutManager] Started timeout for game ${gameId}: ${seconds + bufferSeconds}s`)
  }

  /**
   * 清除指定遊戲的計時器
   *
   * @param gameId 遊戲 ID
   */
  clearTimeout(gameId: string): void {
    const timerInfo = this.timers.get(gameId)
    if (timerInfo) {
      clearTimeout(timerInfo.timerId)
      this.timers.delete(gameId)
      console.log(`[ActionTimeoutManager] Cleared timeout for game ${gameId}`)
    }
  }

  /**
   * 排程延遲執行
   *
   * @param gameId 遊戲 ID
   * @param delayMs 延遲毫秒數
   * @param callback 回調函數
   */
  scheduleAction(gameId: string, delayMs: number, callback: () => void): void {
    this.clearTimeout(gameId)
    const timerId = setTimeout(callback, delayMs)
    // scheduleAction 不用於玩家操作超時，startedAt/totalSeconds 設為 0
    this.timers.set(gameId, {
      timerId,
      startedAt: 0,
      totalSeconds: 0,
    })
    console.log(`[ActionTimeoutManager] Scheduled action for game ${gameId}: ${delayMs}ms`)
  }

  /**
   * 取得指定遊戲的剩餘超時秒數
   *
   * @description
   * 用於斷線重連時計算操作的剩餘時間。
   * 回傳的是面向客戶端的剩餘秒數（不含伺服器緩衝）。
   *
   * @param gameId 遊戲 ID
   * @returns 剩餘秒數（無計時器或已過期回傳 null）
   */
  getRemainingSeconds(gameId: string): number | null {
    const info = this.timers.get(gameId)
    if (!info || info.totalSeconds === 0) {
      return null
    }
    const elapsed = Math.floor((Date.now() - info.startedAt) / 1000)
    const remaining = info.totalSeconds - elapsed
    // 回傳至少 1 秒，避免負數
    return remaining > 0 ? remaining : 1
  }
}

/**
 * 操作超時管理器單例
 */
export const actionTimeoutManager = new ActionTimeoutManager()
