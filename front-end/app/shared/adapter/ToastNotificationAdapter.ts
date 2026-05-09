/**
 * ToastNotificationAdapter
 *
 * @description
 * ToastNotificationPort 的實作，包裝 game-client BC 的 UIStateStore。
 *
 * 此 Adapter 位於 Shared Kernel，可被任何 BC 使用。
 */

import type { ToastNotificationPort, ToastNotification } from '../ports'
import { useUIStateStore } from '~/game-client/adapter/stores/uiState'

const DEFAULT_TOAST_DURATION = 3000

export class ToastNotificationAdapter implements ToastNotificationPort {
  addToast(notification: ToastNotification): string {
    const uiStore = useUIStateStore()

    return uiStore.addToast({
      type: notification.type,
      message: notification.message,
      duration: notification.duration ?? DEFAULT_TOAST_DURATION,
      dismissible: notification.dismissible ?? true,
    })
  }
}

/**
 * 建立 ToastNotificationAdapter 實例
 *
 * @returns ToastNotificationPort 實例
 */
export function createToastNotificationAdapter(): ToastNotificationPort {
  return new ToastNotificationAdapter()
}
