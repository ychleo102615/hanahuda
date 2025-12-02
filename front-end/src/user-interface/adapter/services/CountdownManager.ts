/**
 * CountdownManager - 倒數計時管理器
 *
 * @description
 * 管理倒數計時邏輯（操作倒數、顯示倒數），不依賴 Vue 生命週期。
 * 將副作用（interval）與 store 狀態管理分離。
 *
 * 職責:
 * - 管理 interval 生命週期
 * - 更新 uiState store 的倒數計時狀態
 * - 提供啟動/停止倒數計時的方法
 *
 * 使用方式:
 * ```typescript
 * const countdown = new CountdownManager(uiState)
 * countdown.startActionCountdown(30)
 * countdown.cleanup() // 清理所有 interval
 * ```
 */

import type { useUIStateStore } from '../stores/uiState'

export class CountdownManager {
  // 內部狀態（管理 interval IDs）
  private actionIntervalId?: number
  private displayIntervalId?: number
  private displayOnComplete?: () => void

  constructor(private uiState: ReturnType<typeof useUIStateStore>) {}

  /**
   * 啟動操作倒數
   *
   * @param seconds - 倒數秒數
   */
  startActionCountdown(seconds: number): void {
    // 停止現有倒數
    this.stopActionCountdown()

    this.uiState.actionTimeoutRemaining = seconds
    console.info('[CountdownManager] 啟動操作倒數:', seconds)

    // 建立 interval
    this.actionIntervalId = window.setInterval(() => {
      if (this.uiState.actionTimeoutRemaining !== null && this.uiState.actionTimeoutRemaining > 0) {
        this.uiState.actionTimeoutRemaining--
      } else {
        this.stopActionCountdown()
      }
    }, 1000)
  }

  /**
   * 停止操作倒數
   */
  stopActionCountdown(): void {
    if (this.actionIntervalId !== undefined) {
      clearInterval(this.actionIntervalId)
      this.actionIntervalId = undefined
    }
    this.uiState.actionTimeoutRemaining = null
    console.info('[CountdownManager] 停止操作倒數')
  }

  /**
   * 啟動顯示倒數
   *
   * @param seconds - 倒數秒數
   * @param onComplete - 倒數結束時的回調（可選）
   */
  startDisplayCountdown(seconds: number, onComplete?: () => void): void {
    // 停止現有倒數
    this.stopDisplayCountdown()

    this.uiState.displayTimeoutRemaining = seconds
    this.displayOnComplete = onComplete
    console.info('[CountdownManager] 啟動顯示倒數:', seconds)

    // 建立 interval
    this.displayIntervalId = window.setInterval(() => {
      if (this.uiState.displayTimeoutRemaining !== null && this.uiState.displayTimeoutRemaining > 0) {
        this.uiState.displayTimeoutRemaining--
      } else {
        // 倒數結束，執行回調並停止
        const callback = this.displayOnComplete
        this.stopDisplayCountdown()
        if (callback) {
          callback()
        }
      }
    }, 1000)
  }

  /**
   * 停止顯示倒數
   */
  stopDisplayCountdown(): void {
    if (this.displayIntervalId !== undefined) {
      clearInterval(this.displayIntervalId)
      this.displayIntervalId = undefined
    }
    this.displayOnComplete = undefined
    this.uiState.displayTimeoutRemaining = null
    console.info('[CountdownManager] 停止顯示倒數')
  }

  /**
   * 清理所有倒數計時
   */
  cleanup(): void {
    this.stopActionCountdown()
    this.stopDisplayCountdown()
    console.info('[CountdownManager] 已清理所有倒數計時')
  }
}
