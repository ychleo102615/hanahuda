/**
 * SSE Connection Store
 *
 * @description
 * 管理 SSE 連線，追蹤每個遊戲的活躍連線。
 * 用於向特定遊戲的所有連線廣播事件。
 *
 * 參考: specs/008-nuxt-backend-server/data-model.md#SSE-Connection-Store
 */

import type { GameEvent } from '#shared/contracts'

/**
 * 事件處理器類型
 */
export type EventHandler = (event: GameEvent) => void

/**
 * 連線資訊
 */
export interface ConnectionInfo {
  /** 玩家 ID */
  readonly playerId: string
  /** 連線時間 */
  readonly connectedAt: Date
  /** 事件處理器 */
  readonly handler: EventHandler
}

/**
 * SSE 連線儲存
 *
 * @description
 * 使用 Map 儲存每個遊戲的連線列表。
 * 單例模式，全域共用。
 */
class ConnectionStore {
  /**
   * 遊戲 ID -> 連線列表
   */
  private connections: Map<string, Map<string, ConnectionInfo>> = new Map()

  /**
   * 新增連線
   *
   * @param gameId 遊戲 ID
   * @param playerId 玩家 ID
   * @param handler 事件處理器
   */
  addConnection(gameId: string, playerId: string, handler: EventHandler): void {
    if (!this.connections.has(gameId)) {
      this.connections.set(gameId, new Map())
    }

    const gameConnections = this.connections.get(gameId)!
    gameConnections.set(playerId, {
      playerId,
      connectedAt: new Date(),
      handler,
    })
  }

  /**
   * 移除連線
   *
   * @param gameId 遊戲 ID
   * @param playerId 玩家 ID
   */
  removeConnection(gameId: string, playerId: string): void {
    const gameConnections = this.connections.get(gameId)
    if (gameConnections) {
      gameConnections.delete(playerId)

      // 如果遊戲沒有連線了，清除遊戲條目
      if (gameConnections.size === 0) {
        this.connections.delete(gameId)
      }
    }
  }

  /**
   * 取得遊戲的所有連線
   *
   * @param gameId 遊戲 ID
   * @returns 連線列表
   */
  getConnections(gameId: string): ConnectionInfo[] {
    const gameConnections = this.connections.get(gameId)
    return gameConnections ? Array.from(gameConnections.values()) : []
  }

  /**
   * 取得特定玩家的連線
   *
   * @param gameId 遊戲 ID
   * @param playerId 玩家 ID
   * @returns 連線資訊（若存在）
   */
  getConnection(gameId: string, playerId: string): ConnectionInfo | undefined {
    return this.connections.get(gameId)?.get(playerId)
  }

  /**
   * 檢查玩家是否已連線
   *
   * @param gameId 遊戲 ID
   * @param playerId 玩家 ID
   * @returns 是否已連線
   */
  isConnected(gameId: string, playerId: string): boolean {
    return this.getConnection(gameId, playerId) !== undefined
  }

  /**
   * 取得遊戲的連線數量
   *
   * @param gameId 遊戲 ID
   * @returns 連線數量
   */
  getConnectionCount(gameId: string): number {
    return this.connections.get(gameId)?.size ?? 0
  }

  /**
   * 向遊戲的所有連線廣播事件
   *
   * @param gameId 遊戲 ID
   * @param event 遊戲事件
   */
  broadcast(gameId: string, event: GameEvent): void {
    const connections = this.getConnections(gameId)
    for (const connection of connections) {
      try {
        connection.handler(event)
      } catch {
        // Error handled silently
      }
    }
  }

  /**
   * 向特定玩家發送事件
   *
   * @param gameId 遊戲 ID
   * @param playerId 玩家 ID
   * @param event 遊戲事件
   * @returns 是否發送成功
   */
  sendToPlayer(gameId: string, playerId: string, event: GameEvent): boolean {
    const connection = this.getConnection(gameId, playerId)
    if (connection) {
      try {
        connection.handler(event)
        return true
      } catch {
        return false
      }
    }
    return false
  }

  /**
   * 清除遊戲的所有連線
   *
   * @param gameId 遊戲 ID
   */
  clearGame(gameId: string): void {
    this.connections.delete(gameId)
  }

  /**
   * 取得所有活躍遊戲 ID
   *
   * @returns 遊戲 ID 列表
   */
  getActiveGameIds(): string[] {
    return Array.from(this.connections.keys())
  }

  /**
   * 取得總連線數
   *
   * @returns 總連線數
   */
  getTotalConnectionCount(): number {
    let count = 0
    for (const gameConnections of this.connections.values()) {
      count += gameConnections.size
    }
    return count
  }
}

/**
 * 連線儲存單例
 */
export const connectionStore = new ConnectionStore()
