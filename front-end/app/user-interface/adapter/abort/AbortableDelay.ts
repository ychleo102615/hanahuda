/**
 * AbortableDelay - 可取消的延遲工具函數
 *
 * @description
 * 提供支援 AbortSignal 的延遲函數，取代原有的 CancellableDelayManager。
 * 當 AbortSignal 被觸發時，Promise 會 reject AbortOperationError。
 *
 * @example
 * ```typescript
 * const controller = new AbortController()
 *
 * // 使用可取消的延遲
 * try {
 *   await delay(100, controller.signal)
 *   console.log('Delay completed')
 * } catch (error) {
 *   if (error instanceof AbortOperationError) {
 *     console.log('Delay was aborted')
 *   }
 * }
 *
 * // 等待瀏覽器 layout
 * await waitForLayout(2, controller.signal)
 *
 * // 中止所有操作
 * controller.abort()
 * ```
 *
 * @module user-interface/adapter/abort/AbortableDelay
 */

import { AbortOperationError } from '../../application/types/abort'

/**
 * 可取消的延遲
 *
 * @param ms - 延遲毫秒數
 * @param signal - AbortSignal（可選）
 * @returns Promise，完成時 resolve，被取消時 reject AbortOperationError
 *
 * @throws {AbortOperationError} 當 AbortSignal 被觸發時
 */
export function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    // 已經被 abort
    if (signal?.aborted) {
      reject(new AbortOperationError())
      return
    }

    const timeoutId = setTimeout(() => {
      // 移除 abort 事件監聽器
      signal?.removeEventListener('abort', abortHandler)
      resolve()
    }, ms)

    const abortHandler = () => {
      clearTimeout(timeoutId)
      reject(new AbortOperationError())
    }

    // 監聽 abort 事件
    signal?.addEventListener('abort', abortHandler, { once: true })
  })
}

/**
 * 等待瀏覽器完成 layout
 *
 * @description
 * 使用 requestAnimationFrame 等待瀏覽器完成 layout 計算。
 * 常用於等待 DOM 更新後再進行動畫。
 *
 * @param frames - 等待的幀數（預設 1）
 * @param signal - AbortSignal（可選）
 * @returns Promise，完成時 resolve，被取消時 reject AbortOperationError
 *
 * @throws {AbortOperationError} 當 AbortSignal 被觸發時
 */
export function waitForLayout(frames = 1, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    // 已經被 abort
    if (signal?.aborted) {
      reject(new AbortOperationError())
      return
    }

    let remainingFrames = frames
    let rafId: number
    let aborted = false

    const abortHandler = () => {
      aborted = true
      cancelAnimationFrame(rafId)
      reject(new AbortOperationError())
    }

    const tick = () => {
      // 檢查是否已被 abort（防止競態條件）
      if (aborted) return

      remainingFrames--
      if (remainingFrames <= 0) {
        signal?.removeEventListener('abort', abortHandler)
        resolve()
      } else {
        rafId = requestAnimationFrame(tick)
      }
    }

    // 監聯 abort 事件
    signal?.addEventListener('abort', abortHandler, { once: true })
    rafId = requestAnimationFrame(tick)
  })
}
