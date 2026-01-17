/**
 * ConnectionReadyAdapter - 連線就緒通知 Adapter
 *
 * @description
 * 實現 ConnectionReadyPort，作為 UseCase 和 Composable 之間的橋樑。
 * 使用簡單的回調模式，當 HandleGatewayConnectedUseCase 處理完成後，
 * 通知 useGatewayConnection 執行初始化邏輯。
 *
 * @module game-client/adapter/connection/ConnectionReadyAdapter
 */

import type { ConnectionReadyPort, ConnectionReadyPayload } from '../../application/ports/output/connection-ready.port'

/**
 * 連線就緒回調類型
 */
export type ConnectionReadyCallback = (payload: ConnectionReadyPayload) => void | Promise<void>

/**
 * ConnectionReadyAdapter
 *
 * @description
 * 簡單的事件發射器，讓 UseCase 可以通知 Adapter 層連線已就緒。
 */
export class ConnectionReadyAdapter implements ConnectionReadyPort {
  private callbacks: ConnectionReadyCallback[] = []

  /**
   * 通知連線已就緒（由 UseCase 調用）
   *
   * @param payload - 玩家初始狀態
   */
  notifyConnectionReady(payload: ConnectionReadyPayload): void {
    for (const callback of this.callbacks) {
      try {
        void callback(payload)
      } catch (error) {
        console.error('[ConnectionReadyAdapter] Error in callback:', error)
      }
    }
  }

  /**
   * 註冊連線就緒回調（由 Composable 調用）
   *
   * @param callback - 回調函數，接收玩家初始狀態
   */
  onReady(callback: ConnectionReadyCallback): void {
    this.callbacks.push(callback)
  }

  /**
   * 移除回調
   *
   * @param callback - 要移除的回調函數
   */
  offReady(callback: ConnectionReadyCallback): void {
    const index = this.callbacks.indexOf(callback)
    if (index > -1) {
      this.callbacks.splice(index, 1)
    }
  }

  /**
   * 清除所有回調
   */
  clearCallbacks(): void {
    this.callbacks = []
  }
}

/**
 * 創建 ConnectionReadyAdapter 實例
 */
export function createConnectionReadyAdapter(): ConnectionReadyAdapter {
  return new ConnectionReadyAdapter()
}
