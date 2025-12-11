/**
 * useAbortableMotion - 支援 AbortSignal 的 @vueuse/motion 包裝器
 *
 * @description
 * 包裝 @vueuse/motion 的 useMotion，使其支援 AbortSignal 取消機制。
 *
 * 問題背景：
 * @vueuse/motion 的 apply() 返回的 Promise 在 stop() 被呼叫後會永遠掛起
 * （不 resolve 也不 reject），這導致 Use Cases 無法正確處理取消。
 *
 * 解決方案：
 * 使用 Promise.race() 將原始動畫 Promise 與 abort Promise 競爭，
 * 當 AbortSignal 被觸發時，reject AbortOperationError。
 *
 * @example
 * ```typescript
 * const { apply, stop } = useAbortableMotion(el, motionConfig, signal)
 *
 * try {
 *   await apply('enter')
 *   console.log('Animation completed')
 * } catch (error) {
 *   if (error instanceof AbortOperationError) {
 *     console.log('Animation was aborted')
 *   }
 * }
 * ```
 *
 * @module user-interface/adapter/abort/useAbortableMotion
 */

import { useMotion } from '@vueuse/motion'
import type { MaybeRef } from 'vue'
import type { Variant } from '@vueuse/motion'
import { AbortOperationError } from '../../application/types/abort'

/**
 * useAbortableMotion 的返回類型
 */
export interface UseAbortableMotionReturn {
  /**
   * 執行變體動畫，支援 AbortSignal 中止
   *
   * @param variant - 變體名稱或物件
   * @returns Promise，若被 abort 則 reject AbortOperationError
   * @throws {AbortOperationError} 當 AbortSignal 被觸發時
   */
  apply: (variant: string | Variant) => Promise<void>

  /**
   * 立即停止動畫（不觸發 AbortOperationError）
   *
   * @param keys - 要停止的屬性 key（可選，不傳則停止全部）
   */
  stop: (keys?: string | string[]) => void
}

/**
 * 支援 AbortSignal 的 useMotion 包裝器
 *
 * @param target - 目標 HTML 元素
 * @param config - Motion 配置
 * @param signal - AbortSignal（可選）
 * @returns 包含 apply 和 stop 方法的物件
 */
export function useAbortableMotion(
  target: MaybeRef<HTMLElement | null | undefined>,
  config: Parameters<typeof useMotion>[1],
  signal?: AbortSignal
): UseAbortableMotionReturn {
  const { apply: originalApply, stop } = useMotion(target, config)

  const apply = async (variant: string | Variant): Promise<void> => {
    // 已經被 abort
    if (signal?.aborted) {
      throw new AbortOperationError('Motion aborted before apply')
    }

    // 創建 abort Promise
    // 注意：如果沒有 signal，這個 Promise 永遠不會 settle，
    // 這樣 Promise.race 會等待原始動畫完成
    const abortPromise = new Promise<never>((_, reject) => {
      if (!signal) return // 沒有 signal，不設置任何東西

      const handler = () => {
        reject(new AbortOperationError('Motion aborted during animation'))
      }

      // 監聽 abort 事件
      signal.addEventListener('abort', handler, { once: true })
    })

    // 原始動畫 Promise
    const motionPromise = originalApply(variant)

    // useMotion 可能返回 undefined（如果 target 是 null）
    if (!motionPromise) {
      // 如果沒有動畫 Promise，檢查是否已被 abort
      if (signal?.aborted) {
        throw new AbortOperationError('Motion aborted (no target)')
      }
      return
    }

    try {
      // Promise.race：動畫完成 或 被 abort
      if (signal) {
        await Promise.race([motionPromise, abortPromise])
      } else {
        // 沒有 signal，直接等待原始動畫
        await motionPromise
      }
    } catch (error) {
      if (error instanceof AbortOperationError) {
        // 確保停止底層動畫
        stop()
        throw error
      }
      throw error
    }
  }

  return { apply, stop }
}
