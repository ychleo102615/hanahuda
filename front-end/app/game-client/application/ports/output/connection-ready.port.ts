/**
 * ConnectionReadyPort - 連線就緒通知 Port
 *
 * @description
 * 讓 HandleGatewayConnectedUseCase 通知「連線已就緒」，
 * 並傳遞玩家初始狀態給 Adapter 層。
 *
 * 設計目的：
 * - 解決 onConnected 和 GatewayConnected 的時序問題
 * - 讓 Adapter 層在收到初始狀態後才執行初始化邏輯
 * - 根據狀態決定是否需要 enterMatchmaking
 *
 * @module game-client/application/ports/output/connection-ready.port
 */

/**
 * 玩家初始狀態
 */
export type PlayerInitialStatus = 'IDLE' | 'MATCHMAKING' | 'IN_GAME'

/**
 * 連線就緒事件 Payload
 */
export interface ConnectionReadyPayload {
  readonly playerId: string
  readonly status: PlayerInitialStatus
  // MATCHMAKING 狀態附加資訊
  readonly roomType?: string
  readonly elapsedSeconds?: number
  // IN_GAME 狀態附加資訊
  readonly gameId?: string
}

/**
 * ConnectionReadyPort
 *
 * @description
 * Output Port：讓 UseCase 通知連線已就緒。
 * 由 GatewayWebSocketClient 或 useGatewayConnection 實現。
 */
export interface ConnectionReadyPort {
  /**
   * 通知連線已就緒
   *
   * @param payload - 玩家初始狀態
   */
  notifyConnectionReady(payload: ConnectionReadyPayload): void
}
