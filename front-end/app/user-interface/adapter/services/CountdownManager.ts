/**
 * CountdownManager - 倒數計時管理器
 *
 * @description
 * 管理統一的倒數計時邏輯，不依賴 Vue 生命週期。
 * 將副作用（interval）與 store 狀態管理分離。
 *
 * 職責:
 * - 管理單一 interval 生命週期
 * - 更新 uiState store 的倒數計時狀態（countdownRemaining + countdownMode）
 * - 提供統一的啟動/停止倒數計時方法
 *
 * 使用方式:
 * ```typescript
 * const countdown = new CountdownManager(uiState)
 * countdown.startCountdown(30, 'ACTION')
 * countdown.startCountdown(5, 'DISPLAY', () => { ... })
 * countdown.cleanup() // 清理 interval
 * ```
 */

import type { useUIStateStore } from '../stores/uiState'

export class CountdownManager {
  // 內部狀態（管理單一 interval ID）
  private intervalId?: number
  private onComplete?: () => void

  constructor(private uiState: ReturnType<typeof useUIStateStore>) {}

  /**
   * 啟動倒數計時
   *
   * @param seconds - 倒數秒數
   * @param mode - 倒數模式（'ACTION' 用於 TopInfoBar，'DISPLAY' 用於 Modal）
   * @param onComplete - 倒數結束時的回調（可選，僅 DISPLAY 模式使用）
   */
  startCountdown(seconds: number, mode: 'ACTION' | 'DISPLAY', onComplete?: () => void): void {
    // 停止現有倒數
    this.stopCountdown()

    this.uiState.countdownRemaining = seconds
    this.uiState.countdownMode = mode
    this.onComplete = onComplete
    console.info(`[CountdownManager] 啟動倒數: ${seconds}s, mode: ${mode}`)

    // 建立 interval
    this.intervalId = window.setInterval(() => {
      if (this.uiState.countdownRemaining !== null && this.uiState.countdownRemaining > 0) {
        this.uiState.countdownRemaining--
      } else {
        // 倒數結束，執行回調並停止
        const callback = this.onComplete
        this.stopCountdown()
        if (callback) {
          callback()
        }
      }
    }, 1000)
  }

  /**
   * 停止倒數計時
   */
  stopCountdown(): void {
    if (this.intervalId !== undefined) {
      clearInterval(this.intervalId)
      this.intervalId = undefined
    }
    this.onComplete = undefined
    this.uiState.countdownRemaining = null
    this.uiState.countdownMode = null
    console.info('[CountdownManager] 停止倒數')
  }

  /**
   * 清理所有倒數計時（別名，與 stopCountdown 相同）
   */
  cleanup(): void {
    this.stopCountdown()
    console.info('[CountdownManager] 已清理')
  }
}
