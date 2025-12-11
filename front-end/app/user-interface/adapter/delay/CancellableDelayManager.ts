/**
 * CancellableDelayManager - DelayManagerPort 實作
 *
 * @description
 * 提供可集中取消的延遲機制。
 * 追蹤所有 pending 的 setTimeout 和 requestAnimationFrame，
 * 當 cancelAll() 被呼叫時，清除所有 timer 並 reject Promise。
 *
 * 使用情境：
 * - 重連時需要中斷所有正在等待的 Use Case
 * - 快照恢復時需要清空所有 pending 操作
 *
 * @example
 * ```typescript
 * const delayManager = new CancellableDelayManager()
 *
 * // 使用可取消的延遲
 * await delayManager.delay(50)
 *
 * // 等待瀏覽器 layout
 * await delayManager.waitForLayout()
 *
 * // 重連時取消所有
 * delayManager.cancelAll()
 * ```
 *
 * @module user-interface/adapter/delay/CancellableDelayManager
 */

import { DelayManagerPort, DelayAbortedError } from '../../application/ports/output/delay-manager.port'

/**
 * Pending delay 資料結構
 */
interface PendingDelay {
  reject: (error: Error) => void
  timeoutId?: ReturnType<typeof setTimeout>
  rafId?: number
}

export class CancellableDelayManager extends DelayManagerPort {
  /**
   * 追蹤所有 pending 的延遲操作
   * @private
   */
  private pendingDelays = new Map<number, PendingDelay>()

  /**
   * 下一個 pending delay 的 ID
   * @private
   */
  private nextId = 0

  /**
   * 版本號，每次 cancelAll() 會遞增
   * @private
   */
  private version = 0

  /**
   * 延遲指定毫秒數
   *
   * @param ms - 延遲毫秒數
   * @returns Promise，完成時 resolve，被取消時 reject DelayAbortedError
   */
  delay(ms: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const id = this.nextId++

      const timeoutId = setTimeout(() => {
        this.pendingDelays.delete(id)
        resolve()
      }, ms)

      this.pendingDelays.set(id, { reject, timeoutId })
    })
  }

  /**
   * 等待瀏覽器完成 layout
   *
   * @param frames - 等待的幀數（預設 1）
   * @returns Promise，完成時 resolve，被取消時 reject DelayAbortedError
   */
  waitForLayout(frames = 1): Promise<void> {
    return new Promise((resolve, reject) => {
      const id = this.nextId++
      let remainingFrames = frames

      const tick = () => {
        remainingFrames--
        if (remainingFrames <= 0) {
          this.pendingDelays.delete(id)
          resolve()
        } else {
          const rafId = requestAnimationFrame(tick)
          const pending = this.pendingDelays.get(id)
          if (pending) {
            pending.rafId = rafId
          }
        }
      }

      const rafId = requestAnimationFrame(tick)
      this.pendingDelays.set(id, { reject, rafId })
    })
  }

  /**
   * 取消所有 pending 的延遲操作
   *
   * @description
   * 清除所有 setTimeout 和 requestAnimationFrame，
   * 並 reject 所有 pending Promise（拋出 DelayAbortedError）。
   */
  cancelAll(): void {
    this.version++

    for (const [, pending] of this.pendingDelays) {
      if (pending.timeoutId !== undefined) {
        clearTimeout(pending.timeoutId)
      }
      if (pending.rafId !== undefined) {
        cancelAnimationFrame(pending.rafId)
      }
      pending.reject(new DelayAbortedError())
    }

    this.pendingDelays.clear()
    console.info(`[CancellableDelayManager] All delays cancelled, version: ${this.version}`)
  }

  /**
   * 取得目前版本號
   */
  getVersion(): number {
    return this.version
  }
}
