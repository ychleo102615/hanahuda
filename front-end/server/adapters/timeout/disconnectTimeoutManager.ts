/**
 * Disconnect Timeout Manager
 *
 * @description
 * 斷線超時管理器，管理玩家斷線後的超時計時。
 * 若玩家超過指定時間未重連，對手獲勝。
 *
 * @module server/adapters/timeout/disconnectTimeoutManager
 */

/**
 * 計時器 Key 格式: gameId:playerId
 */
type TimerKey = string

/**
 * 斷線超時秒數（預設 60 秒）
 */
const DISCONNECT_TIMEOUT_SECONDS = 60

/**
 * 斷線超時管理器
 *
 * @description
 * 管理玩家斷線的超時計時。
 * 每個 Key（gameId:playerId）對應一個計時器。
 */
class DisconnectTimeoutManager {
  private timers: Map<TimerKey, NodeJS.Timeout> = new Map()

  /**
   * 開始斷線超時計時
   *
   * @param gameId 遊戲 ID
   * @param playerId 玩家 ID
   * @param onTimeout 超時回調函數
   */
  startDisconnectTimeout(
    gameId: string,
    playerId: string,
    onTimeout: () => void
  ): void {
    const key = `${gameId}:${playerId}`
    this.clearDisconnectTimeout(gameId, playerId)

    const timer = setTimeout(onTimeout, DISCONNECT_TIMEOUT_SECONDS * 1000)
    this.timers.set(key, timer)

    console.log(
      `[DisconnectTimeoutManager] Started disconnect timeout for ${key}: ${DISCONNECT_TIMEOUT_SECONDS}s`
    )
  }

  /**
   * 清除指定玩家的斷線計時器
   *
   * @param gameId 遊戲 ID
   * @param playerId 玩家 ID
   */
  clearDisconnectTimeout(gameId: string, playerId: string): void {
    const key = `${gameId}:${playerId}`
    const timer = this.timers.get(key)
    if (timer) {
      clearTimeout(timer)
      this.timers.delete(key)
      console.log(`[DisconnectTimeoutManager] Cleared disconnect timeout for ${key}`)
    }
  }

  /**
   * 清除指定遊戲的所有斷線計時器
   *
   * @param gameId 遊戲 ID
   */
  clearAllForGame(gameId: string): void {
    for (const key of this.timers.keys()) {
      if (key.startsWith(`${gameId}:`)) {
        const timer = this.timers.get(key)
        if (timer) {
          clearTimeout(timer)
          this.timers.delete(key)
        }
      }
    }
    console.log(`[DisconnectTimeoutManager] Cleared all disconnect timeouts for game ${gameId}`)
  }

  /**
   * 檢查玩家是否有進行中的斷線計時器
   *
   * @param gameId 遊戲 ID
   * @param playerId 玩家 ID
   * @returns 是否有斷線計時器
   */
  hasTimeout(gameId: string, playerId: string): boolean {
    const key = `${gameId}:${playerId}`
    return this.timers.has(key)
  }
}

/**
 * 斷線超時管理器單例
 */
export const disconnectTimeoutManager = new DisconnectTimeoutManager()
