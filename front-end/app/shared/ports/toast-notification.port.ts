/**
 * ToastNotificationPort - Shared Kernel
 *
 * @description
 * 跨 BC 共用的 Toast 通知介面。
 * 定義於 Shared Kernel，由 game-client BC 的 UIStateStore 實作。
 *
 * 使用場景：
 * - Identity BC 登入成功後顯示歡迎訊息
 * - 其他需要顯示 Toast 的 BC
 */

/**
 * Toast 類型
 */
export type ToastType = 'info' | 'success' | 'error' | 'warning' | 'loading'

/**
 * Toast 通知資料
 */
export interface ToastNotification {
  type: ToastType
  message: string
  duration?: number | null // null = persistent (won't auto-dismiss), undefined = use default
  dismissible?: boolean
}

/**
 * Toast 通知 Port
 */
export interface ToastNotificationPort {
  /**
   * 顯示 Toast 通知
   *
   * @param notification - Toast 資料
   * @returns Toast ID（可用於後續移除）
   */
  addToast(notification: ToastNotification): string
}
