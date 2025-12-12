/**
 * Game Timeout Manager - Adapter Layer
 *
 * @description
 * 遊戲計時器的統一實作，管理 CoreGame BC 的所有計時需求。
 * 滿足 SSOT（Single Source of Truth）原則。
 *
 * 職責：
 * - 遊戲計時器：等待玩家操作或等待動畫播放（原 ActionTimeout + DisplayTimeout）
 * - 斷線計時器：玩家斷線後的超時計時
 *
 * @module server/adapters/timeout/gameTimeoutManager
 */

import { GameTimeoutPort } from '~~/server/application/ports/output/gameTimeoutPort'
import { gameConfig } from '~~/server/utils/config'

/**
 * 伺服器端超時緩衝秒數
 *
 * @description
 * 伺服器端計時器會比客戶端多等待此秒數，確保客戶端先觸發超時。
 * 避免因網路延遲導致伺服器比客戶端先判定超時。
 */
const BUFFER_SECONDS = 1.5

/**
 * 遊戲計時器資訊
 */
interface GameTimerInfo {
  /** setTimeout ID */
  timerId: NodeJS.Timeout
  /** 計時器開始時間（Unix timestamp in ms） */
  startedAt: number
  /** 原始超時秒數（不含緩衝） */
  totalSeconds: number
}

/**
 * 斷線計時器 Key 格式: gameId:playerId
 */
type DisconnectTimerKey = string

/**
 * 遊戲計時器管理器
 *
 * @description
 * 統一管理遊戲的所有計時需求。
 */
class GameTimeoutManager extends GameTimeoutPort {
  /** 遊戲計時器（每個遊戲最多一個） */
  private gameTimers: Map<string, GameTimerInfo> = new Map()

  /** 斷線計時器（每個玩家獨立） */
  private disconnectTimers: Map<DisconnectTimerKey, NodeJS.Timeout> = new Map()

  // ============================================================
  // 遊戲計時器（Action 和 Display 統一）
  // ============================================================

  /**
   * 啟動遊戲計時器
   *
   * @param gameId - 遊戲 ID
   * @param seconds - 超時秒數（面向客戶端）
   * @param onTimeout - 超時回調函數
   */
  startTimeout(gameId: string, seconds: number, onTimeout: () => void): void {
    this.clearTimeout(gameId)

    const totalMs = (seconds + BUFFER_SECONDS) * 1000
    const timerId = setTimeout(onTimeout, totalMs)

    this.gameTimers.set(gameId, {
      timerId,
      startedAt: Date.now(),
      totalSeconds: seconds,
    })

    console.log(
      `[GameTimeoutManager] Started timeout for game ${gameId}: ${seconds}s (+${BUFFER_SECONDS}s buffer)`
    )
  }

  /**
   * 清除遊戲計時器
   *
   * @param gameId - 遊戲 ID
   */
  clearTimeout(gameId: string): void {
    const timerInfo = this.gameTimers.get(gameId)
    if (timerInfo) {
      clearTimeout(timerInfo.timerId)
      this.gameTimers.delete(gameId)
      console.log(`[GameTimeoutManager] Cleared timeout for game ${gameId}`)
    }
  }

  /**
   * 取得遊戲計時器的剩餘秒數
   *
   * @param gameId - 遊戲 ID
   * @returns 剩餘秒數（無計時器或已過期回傳 null）
   */
  getRemainingSeconds(gameId: string): number | null {
    const info = this.gameTimers.get(gameId)
    if (!info || info.totalSeconds === 0) {
      return null
    }

    const elapsed = Math.floor((Date.now() - info.startedAt) / 1000)
    const remaining = info.totalSeconds - elapsed

    // 回傳至少 1 秒，避免負數
    return remaining > 0 ? remaining : 1
  }

  // ============================================================
  // 斷線計時器
  // ============================================================

  /**
   * 啟動斷線計時器
   *
   * @param gameId - 遊戲 ID
   * @param playerId - 玩家 ID
   * @param onTimeout - 超時回調函數
   */
  startDisconnectTimeout(gameId: string, playerId: string, onTimeout: () => void): void {
    const key = this.getDisconnectKey(gameId, playerId)
    this.clearDisconnectTimeout(gameId, playerId)

    const timer = setTimeout(onTimeout, gameConfig.disconnect_timeout_seconds * 1000)
    this.disconnectTimers.set(key, timer)

    console.log(
      `[GameTimeoutManager] Started disconnect timeout for ${key}: ${gameConfig.disconnect_timeout_seconds}s`
    )
  }

  /**
   * 清除指定玩家的斷線計時器
   *
   * @param gameId - 遊戲 ID
   * @param playerId - 玩家 ID
   */
  clearDisconnectTimeout(gameId: string, playerId: string): void {
    const key = this.getDisconnectKey(gameId, playerId)
    const timer = this.disconnectTimers.get(key)
    if (timer) {
      clearTimeout(timer)
      this.disconnectTimers.delete(key)
      console.log(`[GameTimeoutManager] Cleared disconnect timeout for ${key}`)
    }
  }

  /**
   * 清除遊戲的所有斷線計時器
   *
   * @param gameId - 遊戲 ID
   */
  clearAllDisconnectTimeouts(gameId: string): void {
    const prefix = `${gameId}:`
    for (const key of this.disconnectTimers.keys()) {
      if (key.startsWith(prefix)) {
        const timer = this.disconnectTimers.get(key)
        if (timer) {
          clearTimeout(timer)
          this.disconnectTimers.delete(key)
        }
      }
    }
    console.log(`[GameTimeoutManager] Cleared all disconnect timeouts for game ${gameId}`)
  }

  /**
   * 檢查指定玩家是否有斷線計時器
   *
   * @param gameId - 遊戲 ID
   * @param playerId - 玩家 ID
   * @returns 是否有斷線計時器
   */
  hasDisconnectTimeout(gameId: string, playerId: string): boolean {
    const key = this.getDisconnectKey(gameId, playerId)
    return this.disconnectTimers.has(key)
  }

  // ============================================================
  // 遊戲層級清理
  // ============================================================

  /**
   * 清除指定遊戲的所有計時器
   *
   * @param gameId - 遊戲 ID
   */
  clearAllForGame(gameId: string): void {
    this.clearTimeout(gameId)
    this.clearAllDisconnectTimeouts(gameId)
    console.log(`[GameTimeoutManager] Cleared all timers for game ${gameId}`)
  }

  // ============================================================
  // 私有方法
  // ============================================================

  /**
   * 產生斷線計時器的 key
   *
   * @param gameId - 遊戲 ID
   * @param playerId - 玩家 ID
   * @returns key 字串
   */
  private getDisconnectKey(gameId: string, playerId: string): DisconnectTimerKey {
    return `${gameId}:${playerId}`
  }
}

/**
 * 遊戲計時器管理器單例
 */
export const gameTimeoutManager = new GameTimeoutManager()
