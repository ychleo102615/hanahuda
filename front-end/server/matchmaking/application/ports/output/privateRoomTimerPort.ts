/**
 * PrivateRoom Timer Port
 *
 * @description
 * 私房計時器 Output Port。
 * UseCase 透過此 Port 操作計時器，避免直接依賴 Adapter 層的 TimeoutManager。
 * 由 PrivateRoomTimeoutManager (Adapter 層) 實作。
 * Timer 到期的 callback 在 DI 容器組裝時注入。
 *
 * @module server/matchmaking/application/ports/output/privateRoomTimerPort
 */

/**
 * PrivateRoom Timer Port
 */
export abstract class PrivateRoomTimerPort {
  /** 設定房間過期計時器 */
  abstract setExpirationTimer(roomId: string, durationMs: number): void

  /** 設定即將過期警告計時器 */
  abstract setWarningTimer(roomId: string, durationMs: number): void

  /** 設定房主斷線計時器 */
  abstract setDisconnectionTimer(playerId: string, durationMs: number): void

  /** 清除指定房間的所有計時器 */
  abstract clearTimers(roomId: string): void

  /** 清除指定玩家的斷線計時器 */
  abstract clearDisconnectionTimer(playerId: string): void
}
