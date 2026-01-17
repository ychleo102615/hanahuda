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

  /**
   * 強制斷開玩家連線
   *
   * @param playerId - 玩家 ID
   * @param code - WebSocket 關閉代碼（預設 4002）
   * @param reason - 關閉原因
   */
  forceDisconnect(playerId: string, code?: number, reason?: string): void
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

    return connectionInfo
  }

  removeConnection(playerId: string): void {
    const connection = this.connections.get(playerId)
    if (connection) {
      // 取消訂閱，防止記憶體洩漏
      connection.unsubscribe()
      this.peerToPlayerId.delete(connection.peer)
      this.connections.delete(playerId)
    }
  }

  sendToPlayer(playerId: string, event: GatewayEvent): void {
    const connection = this.connections.get(playerId)
    if (connection) {
      try {
        connection.peer.send(JSON.stringify(event))
      } catch (error) {
        // 捕捉同步錯誤
        this.handleSendError(playerId, error)
      }
    }
  }

  /**
   * 處理發送錯誤
   *
   * @description
   * ECONNRESET/EPIPE 是客戶端斷線的正常情況，不需要記錄為錯誤。
   */
  private handleSendError(playerId: string, error: unknown): void {
    const errorCode = (error as NodeJS.ErrnoException)?.code
    if (errorCode !== 'ECONNRESET' && errorCode !== 'EPIPE') {
      logger.error('Failed to send WebSocket message', { playerId, error })
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

  forceDisconnect(playerId: string, code: number = 4002, reason: string = 'Session invalidated'): void {
    const connection = this.connections.get(playerId)
    if (connection) {
      try {
        // 先關閉 WebSocket 連線
        connection.peer.close(code, reason)
      } catch (error) {
        // ECONNRESET/EPIPE 是連線已斷開的正常情況
        const errorCode = (error as NodeJS.ErrnoException)?.code
        if (errorCode !== 'ECONNRESET' && errorCode !== 'EPIPE') {
          logger.error('Failed to force disconnect WebSocket', { playerId, error })
        }
      }
      // 清理連線資訊
      this.removeConnection(playerId)
    }
  }
}

/**
 * WsConnectionManager 單例
 */
export const wsConnectionManager: IWsConnectionManager = new WsConnectionManager()
