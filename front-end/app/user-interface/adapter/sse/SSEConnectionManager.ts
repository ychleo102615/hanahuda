/**
 * SSEConnectionManager - SSE 連線管理器
 *
 * @deprecated
 * 此管理器已被 GatewayEventClient + useGatewayConnection 取代。
 * 新架構使用單一 SSE 連線接收所有遊戲相關事件。
 * 此類別保留用於向後兼容，未來版本將移除。
 *
 * @description
 * 管理 SSE 連線的建立、狀態同步與斷開。
 * 協調 GameEventClient 與 UIStateStore 的互動。
 *
 * 職責:
 * - 建立和管理 SSE 連線生命週期
 * - 自動同步連線狀態到 UIStateStore
 * - 處理連線錯誤和重連
 *
 * SSE-First Architecture:
 * - 連線即觸發 join/reconnect（由後端處理）
 * - 第一個事件永遠是 InitialState
 * - 前端根據 response_type 決定顯示邏輯
 *
 * @see GatewayEventClient - 新的統一 SSE 客戶端
 * @see useGatewayConnection - 新的連線管理 Composable
 *
 * @note session_token 由 HttpOnly Cookie 自動傳送，無需手動傳遞
 *
 * @example
 * ```typescript
 * const manager = container.resolve(TOKENS.SSEConnectionManager)
 * manager.connect({ playerId: 'xxx', playerName: 'Alice' })
 * ```
 */

import type { GameEventClient, SSEConnectionParams } from './GameEventClient'
import type { useUIStateStore } from '../stores/uiState'

/**
 * SSEConnectionManager 類別
 */
export class SSEConnectionManager {
  private readonly gameEventClient: GameEventClient
  private readonly uiStateStore: ReturnType<typeof useUIStateStore>

  // 保存連線參數供重連使用
  private currentParams: SSEConnectionParams | null = null

  /**
   * @param gameEventClient - SSE 客戶端實例
   * @param uiStateStore - UI 狀態 Store 實例
   */
  constructor(
    gameEventClient: GameEventClient,
    uiStateStore: ReturnType<typeof useUIStateStore>,
  ) {
    this.gameEventClient = gameEventClient
    this.uiStateStore = uiStateStore

    // 設定連線狀態回調
    this.setupCallbacks()
  }

  /**
   * 建立 SSE 連線（SSE-First Architecture）
   *
   * @param params - 連線參數
   *
   * @note session_token 由 HttpOnly Cookie 自動傳送，無需手動傳遞
   *
   * @example
   * ```typescript
   * // 新遊戲
   * manager.connect({ playerId: 'player-1', playerName: 'Alice' })
   *
   * // 重連（有 gameId）
   * manager.connect({ playerId: 'player-1', playerName: 'Alice', gameId: 'game-123' })
   * ```
   */
  connect(params: SSEConnectionParams): void {

    // 儲存連線參數供重連使用
    this.currentParams = params

    // 更新連線狀態為 connecting
    this.uiStateStore.setConnectionStatus('connecting')

    // 建立連線（session_token 由 Cookie 自動傳送）
    this.gameEventClient.connect(params)
  }

  /**
   * 斷開 SSE 連線
   */
  disconnect(): void {
    this.gameEventClient.disconnect()
    this.uiStateStore.setConnectionStatus('disconnected')
  }

  /**
   * 檢查是否已連線
   */
  isConnected(): boolean {
    return this.gameEventClient.isConnected()
  }

  /**
   * 取得當前連線參數
   */
  getCurrentParams(): SSEConnectionParams | null {
    return this.currentParams
  }

  /**
   * 設定連線狀態回調
   * @private
   */
  private setupCallbacks(): void {
    // 連線建立成功
    this.gameEventClient.onConnectionEstablished(() => {
      this.uiStateStore.setConnectionStatus('connected')
      this.uiStateStore.hideReconnectionMessage()
    })

    // 連線中斷
    this.gameEventClient.onConnectionLost(() => {
      this.uiStateStore.setConnectionStatus('disconnected')
      this.uiStateStore.showReconnectionMessage()
    })

    // 重連失敗
    this.gameEventClient.onConnectionFailed(() => {
      this.uiStateStore.setConnectionStatus('disconnected')
      this.uiStateStore.showErrorMessage('Unable to connect to game server')
    })
  }
}
