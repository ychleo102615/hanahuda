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
 * - 處理邊界情況（seconds <= 0 時立即完成）
 *
 * 語義：
 * - remaining = 5 表示「還有 5 秒」
 * - remaining = 0 表示「時間到了」→ 觸發 callback
 * - UI 不會顯示 0（callback 觸發時立即 stopCountdown）
 *
 * 使用方式:
 * ```typescript
 * const countdown = new CountdownManager(uiState)
 * countdown.startCountdown(30, 'ACTION')
 * countdown.startCountdown(5, 'DISPLAY', () => { ... })
 * countdown.startCountdown(0, 'DISPLAY', () => { ... }) // 立即執行 callback
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
   * @param seconds - 倒數秒數（<= 0 時立即觸發 callback）
   * @param mode - 倒數模式（'ACTION' 用於 TopInfoBar，'DISPLAY' 用於 Modal）
   * @param onComplete - 倒數結束時的回調（可選）
   */
  startCountdown(seconds: number, mode: 'ACTION' | 'DISPLAY', onComplete?: () => void): void {
    // 停止現有倒數
    this.stopCountdown()

    // 邊界情況：seconds <= 0 表示「時間已到」，立即完成
    if (seconds <= 0) {
      console.info(`[CountdownManager] seconds = ${seconds}，立即完成`)
      // ACTION 模式超時：禁止玩家操作
      if (mode === 'ACTION') {
        this.uiState.setActionTimeoutExpired(true)
      }
      if (onComplete) {
        onComplete()
      }
      return
    }

    this.uiState.countdownRemaining = seconds
    this.uiState.countdownMode = mode
    this.onComplete = onComplete
    console.info(`[CountdownManager] 啟動倒數: ${seconds}s, mode: ${mode}`)

    // 建立 interval
    this.intervalId = window.setInterval(() => {
      if (this.uiState.countdownRemaining !== null && this.uiState.countdownRemaining > 0) {
        this.uiState.countdownRemaining--

        // 當 remaining 變成 0 時，觸發 callback
        // UI 不會顯示 0，因為 stopCountdown 會立即將 remaining 設為 null
        if (this.uiState.countdownRemaining === 0) {
          const callback = this.onComplete
          // ACTION 模式超時：禁止玩家操作（在 stopCountdown 之前檢查，因為 stop 會清除 mode）
          const isActionTimeout = this.uiState.countdownMode === 'ACTION'
          this.stopCountdown()
          if (isActionTimeout) {
            this.uiState.setActionTimeoutExpired(true)
          }
          if (callback) {
            callback()
          }
        }
      } else {
        // 異常情況（remaining 是 null 或已經是 0），停止計時
        this.stopCountdown()
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
