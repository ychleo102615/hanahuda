/**
 * Shared Kernel - Ports
 *
 * @description
 * 跨 BC 共用的 Port 介面定義。
 * 這些介面由不同 BC 的 Adapter 層實作。
 */

export type { ToastNotificationPort, ToastNotification, ToastType } from './toast-notification.port'
export type { CurrentPlayerContextPort, CurrentPlayerContext } from './current-player-context.port'
