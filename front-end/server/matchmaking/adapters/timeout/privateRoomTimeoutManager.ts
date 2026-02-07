/**
 * PrivateRoom Timeout Manager
 *
 * @description
 * PrivateRoomTimerPort 的實作。
 * 管理房間過期、警告、斷線計時器。
 * Callback 在 DI 容器組裝時注入。
 *
 * @module server/matchmaking/adapters/timeout/privateRoomTimeoutManager
 */

import { PrivateRoomTimerPort } from '../../application/ports/output/privateRoomTimerPort'

/**
 * Timer Callbacks
 */
export interface PrivateRoomTimerCallbacks {
  onExpire: (roomId: string) => void
  onWarning: (roomId: string) => void
  onDisconnect: (playerId: string) => void
}

/**
 * PrivateRoomTimeoutManager
 */
export class PrivateRoomTimeoutManager extends PrivateRoomTimerPort {
  private expirationTimers = new Map<string, NodeJS.Timeout>()
  private warningTimers = new Map<string, NodeJS.Timeout>()
  private disconnectionTimers = new Map<string, NodeJS.Timeout>()

  constructor(private readonly callbacks: PrivateRoomTimerCallbacks) {
    super()
  }

  setExpirationTimer(roomId: string, durationMs: number): void {
    this.clearExpirationTimer(roomId)
    const timer = setTimeout(() => {
      this.expirationTimers.delete(roomId)
      this.callbacks.onExpire(roomId)
    }, durationMs)
    this.expirationTimers.set(roomId, timer)
  }

  setWarningTimer(roomId: string, durationMs: number): void {
    this.clearWarningTimer(roomId)
    const timer = setTimeout(() => {
      this.warningTimers.delete(roomId)
      this.callbacks.onWarning(roomId)
    }, durationMs)
    this.warningTimers.set(roomId, timer)
  }

  setDisconnectionTimer(playerId: string, durationMs: number): void {
    this.clearDisconnectionTimer(playerId)
    const timer = setTimeout(() => {
      this.disconnectionTimers.delete(playerId)
      this.callbacks.onDisconnect(playerId)
    }, durationMs)
    this.disconnectionTimers.set(playerId, timer)
  }

  clearTimers(roomId: string): void {
    this.clearExpirationTimer(roomId)
    this.clearWarningTimer(roomId)
  }

  clearDisconnectionTimer(playerId: string): void {
    const timer = this.disconnectionTimers.get(playerId)
    if (timer) {
      clearTimeout(timer)
      this.disconnectionTimers.delete(playerId)
    }
  }

  private clearExpirationTimer(roomId: string): void {
    const timer = this.expirationTimers.get(roomId)
    if (timer) {
      clearTimeout(timer)
      this.expirationTimers.delete(roomId)
    }
  }

  private clearWarningTimer(roomId: string): void {
    const timer = this.warningTimers.get(roomId)
    if (timer) {
      clearTimeout(timer)
      this.warningTimers.delete(roomId)
    }
  }
}

// =============================================================================
// Singleton
// =============================================================================

let instance: PrivateRoomTimeoutManager | null = null

/**
 * 初始化 PrivateRoomTimeoutManager（由 DI Container 呼叫）
 */
export function initPrivateRoomTimeoutManager(callbacks: PrivateRoomTimerCallbacks): PrivateRoomTimeoutManager {
  instance = new PrivateRoomTimeoutManager(callbacks)
  return instance
}

/**
 * 取得 PrivateRoomTimeoutManager 單例
 */
export function getPrivateRoomTimeoutManager(): PrivateRoomTimeoutManager {
  if (!instance) {
    throw new Error('PrivateRoomTimeoutManager not initialized. Call initPrivateRoomTimeoutManager first.')
  }
  return instance
}

/**
 * 重置 PrivateRoomTimeoutManager（僅用於測試）
 */
export function resetPrivateRoomTimeoutManager(): void {
  instance = null
}
