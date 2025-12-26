/**
 * InMemoryGameLock - Adapter Layer
 *
 * @description
 * 使用 Promise-based 悲觀鎖實作。
 * 利用 Node.js 單執行緒特性，無需真正的 mutex。
 *
 * 特點：
 * - Per-gameId 鎖粒度（不同遊戲可並行）
 * - 可重入鎖（使用 AsyncLocalStorage 追蹤呼叫鏈）
 * - 自動釋放（finally 區塊確保）
 *
 * @module server/adapters/lock/inMemoryGameLock
 */

import { AsyncLocalStorage } from 'async_hooks'
import { GameLockPort } from '~~/server/application/ports/output/gameLockPort'
import { loggers } from '~~/server/utils/logger'

const logger = loggers.adapter('GameLock')

/**
 * 用於追蹤當前呼叫鏈持有的鎖
 */
const lockContext = new AsyncLocalStorage<Set<string>>()

/**
 * InMemoryGameLock
 *
 * 可重入的 Promise-based 悲觀鎖。
 */
export class InMemoryGameLock extends GameLockPort {
  /**
   * 每個 gameId 的鎖佇列
   * 值是 Promise chain 的末端
   */
  private locks: Map<string, Promise<void>> = new Map()

  /**
   * 取得遊戲鎖並執行操作
   */
  async withLock<T>(gameId: string, operation: () => Promise<T>): Promise<T> {
    // 檢查是否可重入（當前呼叫鏈已持有此鎖）
    const heldLocks = lockContext.getStore()
    if (heldLocks?.has(gameId)) {
      // 可重入：直接執行，不需等待
      logger.debug('Reentrant lock access', { gameId })
      return operation()
    }

    // 取得當前鎖（若無則為已解決的 Promise）
    const currentLock = this.locks.get(gameId) ?? Promise.resolve()

    // 建立新的鎖 Promise
    let releaseLock!: () => void
    const newLock = new Promise<void>((resolve) => {
      releaseLock = resolve
    })

    // 將新鎖加入佇列
    this.locks.set(gameId, newLock)

    // 等待前一個鎖釋放
    await currentLock

    logger.debug('Lock acquired', { gameId })

    // 建立或更新持有鎖的集合
    const newHeldLocks = new Set(heldLocks ?? [])
    newHeldLocks.add(gameId)

    try {
      // 在 AsyncLocalStorage context 中執行操作
      return await lockContext.run(newHeldLocks, operation)
    } finally {
      // 確保鎖一定會被釋放
      releaseLock()
      logger.debug('Lock released', { gameId })

      // 清理：若此鎖是最後一個，移除 entry
      if (this.locks.get(gameId) === newLock) {
        this.locks.delete(gameId)
      }
    }
  }
}

/**
 * 單例匯出
 */
export const inMemoryGameLock = new InMemoryGameLock()
