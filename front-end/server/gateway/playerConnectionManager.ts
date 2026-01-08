/**
 * Player Connection Manager - 玩家連線管理
 *
 * @description
 * 管理玩家的 SSE 連線，負責：
 * - 註冊/移除連線
 * - 訂閱 PlayerEventBus 的玩家事件
 * - 連線關閉時自動清理 listener
 *
 * @module server/gateway/playerConnectionManager
 */

import {
  playerEventBus,
  type GatewayEvent,
  type PlayerUnsubscribe,
} from '../shared/infrastructure/event-bus'

/**
 * 玩家連線資訊
 */
export interface PlayerConnectionInfo {
  readonly playerId: string
  readonly connectedAt: Date
  readonly unsubscribe: PlayerUnsubscribe
}

/**
 * PlayerConnectionManager 介面
 */
export interface IPlayerConnectionManager {
  /**
   * 註冊玩家連線
   *
   * @param playerId - 玩家 ID
   * @param sendEvent - 發送事件到 SSE 連線的函數
   * @returns 連線資訊
   */
  registerConnection(
    playerId: string,
    sendEvent: (event: GatewayEvent) => void
  ): PlayerConnectionInfo

  /**
   * 移除玩家連線
   */
  removeConnection(playerId: string): void

  /**
   * 檢查玩家是否已連線
   */
  isConnected(playerId: string): boolean

  /**
   * 取得連線數量
   */
  getConnectionCount(): number
}

/**
 * PlayerConnectionManager 實作
 */
class PlayerConnectionManager implements IPlayerConnectionManager {
  private connections = new Map<string, PlayerConnectionInfo>()

  registerConnection(
    playerId: string,
    sendEvent: (event: GatewayEvent) => void
  ): PlayerConnectionInfo {
    // 若已有連線，先移除舊連線（避免重複訂閱）
    this.removeConnection(playerId)

    // 訂閱 PlayerEventBus，接收該玩家的事件
    const unsubscribe = playerEventBus.onPlayerEvent(playerId, sendEvent)

    const connectionInfo: PlayerConnectionInfo = {
      playerId,
      connectedAt: new Date(),
      unsubscribe,
    }

    this.connections.set(playerId, connectionInfo)
    return connectionInfo
  }

  removeConnection(playerId: string): void {
    const connection = this.connections.get(playerId)
    if (connection) {
      // 取消訂閱，防止記憶體洩漏
      connection.unsubscribe()
      this.connections.delete(playerId)
    }
  }

  isConnected(playerId: string): boolean {
    return this.connections.has(playerId)
  }

  getConnectionCount(): number {
    return this.connections.size
  }
}

/**
 * PlayerConnectionManager 單例
 */
export const playerConnectionManager: IPlayerConnectionManager = new PlayerConnectionManager()
