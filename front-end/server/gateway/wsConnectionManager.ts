/**
 * WebSocket Connection Manager - WebSocket 連線管理
 *
 * @description
 * 管理玩家的 WebSocket 連線，負責：
 * - 註冊/移除連線
 * - 訂閱 PlayerEventBus 的玩家事件
 * - 透過 WebSocket 發送事件給玩家
 * - 連線關閉時自動清理 listener
 *
 * @module server/gateway/wsConnectionManager
 */

import type { Peer } from 'crossws'
import {
  playerEventBus,
  type GatewayEvent,
  type PlayerUnsubscribe,
} from '../shared/infrastructure/event-bus'
import { logger } from '../utils/logger'

/**
 * WebSocket 連線資訊
 */
export interface WsConnectionInfo {
  readonly playerId: string
  readonly peer: Peer
  readonly connectedAt: Date
  readonly unsubscribe: PlayerUnsubscribe
}

/**
 * WsConnectionManager 介面
 */
export interface IWsConnectionManager {
  /**
   * 註冊玩家連線
   *
   * @param playerId - 玩家 ID
   * @param peer - WebSocket peer 實例
   * @returns 連線資訊
   */
  registerConnection(playerId: string, peer: Peer): WsConnectionInfo

  /**
   * 移除玩家連線
   */
  removeConnection(playerId: string): void

  /**
   * 發送事件給玩家
   */
  sendToPlayer(playerId: string, event: GatewayEvent): void

  /**
   * 檢查玩家是否已連線
   */
  isConnected(playerId: string): boolean

  /**
   * 取得玩家的 peer（用於命令回應）
   */
  getPeer(playerId: string): Peer | undefined

  /**
   * 取得連線數量
   */
  getConnectionCount(): number

  /**
   * 根據 peer 取得 playerId
   */
  getPlayerIdByPeer(peer: Peer): string | undefined
}

/**
 * WsConnectionManager 實作
 */
class WsConnectionManager implements IWsConnectionManager {
  private connections = new Map<string, WsConnectionInfo>()
  private peerToPlayerId = new Map<Peer, string>()

  registerConnection(playerId: string, peer: Peer): WsConnectionInfo {
    // 若已有連線，先移除舊連線（避免重複訂閱）
    this.removeConnection(playerId)

    // 建立發送事件的函數
    const sendEvent = (event: GatewayEvent) => {
      this.sendToPlayer(playerId, event)
    }

    // 訂閱 PlayerEventBus，接收該玩家的事件
    const unsubscribe = playerEventBus.onPlayerEvent(playerId, sendEvent)

    const connectionInfo: WsConnectionInfo = {
      playerId,
      peer,
      connectedAt: new Date(),
      unsubscribe,
    }

    this.connections.set(playerId, connectionInfo)
    this.peerToPlayerId.set(peer, playerId)

    logger.info('WebSocket connection registered', { playerId })
    return connectionInfo
  }

  removeConnection(playerId: string): void {
    const connection = this.connections.get(playerId)
    if (connection) {
      // 取消訂閱，防止記憶體洩漏
      connection.unsubscribe()
      this.peerToPlayerId.delete(connection.peer)
      this.connections.delete(playerId)
      logger.info('WebSocket connection removed', { playerId })
    }
  }

  sendToPlayer(playerId: string, event: GatewayEvent): void {
    const connection = this.connections.get(playerId)
    if (connection) {
      try {
        connection.peer.send(JSON.stringify(event))
      } catch (error) {
        logger.error('Failed to send WebSocket message', { playerId, error })
      }
    }
  }

  isConnected(playerId: string): boolean {
    return this.connections.has(playerId)
  }

  getPeer(playerId: string): Peer | undefined {
    return this.connections.get(playerId)?.peer
  }

  getConnectionCount(): number {
    return this.connections.size
  }

  getPlayerIdByPeer(peer: Peer): string | undefined {
    return this.peerToPlayerId.get(peer)
  }
}

/**
 * WsConnectionManager 單例
 */
export const wsConnectionManager: IWsConnectionManager = new WsConnectionManager()
