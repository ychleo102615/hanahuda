/**
 * GatewayEventClient - 統一 Gateway SSE 客戶端
 *
 * @description
 * 使用原生 EventSource API 建立 Gateway SSE 連線，接收所有遊戲相關事件。
 * 包含自動重連機制（指數退避，最多 5 次）。
 *
 * Gateway Architecture:
 * - 單一 SSE 連線：/api/v1/events
 * - 身份驗證：透過 session_id Cookie
 * - 事件格式：${domain}:${type} (例如 MATCHMAKING:MatchFound, GAME:RoundDealt)
 * - 初始事件：GatewayConnected（包含玩家狀態）
 *
 * @example
 * ```typescript
 * const router = new GatewayEventRouter(gameRouter, matchmakingRouter)
 * const client = new GatewayEventClient(router)
 * client.connect()
 * ```
 *
 * @module app/user-interface/adapter/sse/GatewayEventClient
 */

import { GATEWAY_SSE_EVENT_TYPES, type GatewayEvent } from '#shared/contracts'
import type { GatewayEventRouter } from './GatewayEventRouter'

/**
 * 睡眠輔助函數
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * GatewayEventClient 類別
 */
export class GatewayEventClient {
  private eventSource: EventSource | null = null
  private readonly eventRouter: GatewayEventRouter

  // 重連機制
  private reconnectAttempts = 0
  private readonly maxAttempts = 5
  private readonly reconnectDelays = [1000, 2000, 4000, 8000, 16000] // 指數退避
  private shouldReconnect = false // 控制重連，disconnect 時設為 false

  // 連線狀態回調
  private onConnectionEstablishedCallback?: () => void
  private onConnectionLostCallback?: () => void
  private onConnectionFailedCallback?: () => void

  /**
   * @param eventRouter - Gateway 事件路由器實例
   */
  constructor(eventRouter: GatewayEventRouter) {
    this.eventRouter = eventRouter
  }

  /**
   * 建立 Gateway SSE 連線
   *
   * @description
   * 連線到統一的 Gateway SSE 端點 `/api/v1/events`。
   * 身份驗證透過 HttpOnly Cookie 自動傳送。
   * 連線成功後會收到 GatewayConnected 事件，包含玩家目前狀態。
   *
   * @example
   * ```typescript
   * client.connect()
   * ```
   */
  connect(): void {
    // 啟用重連機制
    this.shouldReconnect = true

    // Gateway 端點不需要參數，身份由 Cookie 驗證
    const url = '/api/v1/events'

    try {
      // EventSource 會自動包含同源 Cookie（包含 session_id）
      this.eventSource = new EventSource(url, { withCredentials: true })

      // 連線建立成功
      this.eventSource.onopen = () => {
        this.reconnectAttempts = 0
        this.onConnectionEstablishedCallback?.()
      }

      // 連線錯誤或中斷
      this.eventSource.onerror = () => {
        this.eventSource?.close()
        this.eventSource = null
        this.onConnectionLostCallback?.()
        void this.reconnect()
      }

      // 註冊所有 Gateway 事件監聽器
      this.registerEventListeners()
    } catch {
      this.onConnectionFailedCallback?.()
    }
  }

  /**
   * 斷開 SSE 連線
   *
   * @description
   * 斷開連線時會同時清空事件處理鏈，確保舊事件不會繼續處理。
   *
   * @example
   * ```typescript
   * client.disconnect()
   * ```
   */
  disconnect(): void {
    // 停止重連機制
    this.shouldReconnect = false
    this.reconnectAttempts = 0

    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }
    // 清空事件處理鏈，防止舊事件繼續處理
    this.eventRouter.clearEventChain()
  }

  /**
   * 檢查是否已連線
   *
   * @returns 是否已連線
   */
  isConnected(): boolean {
    return (
      this.eventSource !== null &&
      this.eventSource.readyState === EventSource.OPEN
    )
  }

  /**
   * 設定連線建立成功回調
   */
  onConnectionEstablished(callback: () => void): void {
    this.onConnectionEstablishedCallback = callback
  }

  /**
   * 設定連線中斷回調
   */
  onConnectionLost(callback: () => void): void {
    this.onConnectionLostCallback = callback
  }

  /**
   * 設定重連失敗回調
   */
  onConnectionFailed(callback: () => void): void {
    this.onConnectionFailedCallback = callback
  }

  /**
   * 註冊所有 Gateway SSE 事件監聽器
   * @private
   */
  private registerEventListeners(): void {
    if (!this.eventSource) return

    // 註冊所有 Gateway 事件類型
    GATEWAY_SSE_EVENT_TYPES.forEach((eventType) => {
      this.eventSource!.addEventListener(eventType, (event: MessageEvent) => {
        this.handleEvent(event)
      })
    })
  }

  /**
   * 處理接收到的事件
   * @private
   */
  private handleEvent(event: MessageEvent): void {
    try {
      const gatewayEvent: GatewayEvent = JSON.parse(event.data)
      this.eventRouter.route(gatewayEvent)
    } catch {
      // 忽略 JSON 解析錯誤
    }
  }

  /**
   * 自動重連機制（指數退避）
   * @private
   */
  private async reconnect(): Promise<void> {
    // 檢查是否已被 disconnect，若是則停止重連
    if (!this.shouldReconnect) {
      return
    }

    if (this.reconnectAttempts >= this.maxAttempts) {
      this.onConnectionFailedCallback?.()
      return
    }

    const delay = this.reconnectDelays[this.reconnectAttempts] ?? 16000
    this.reconnectAttempts++

    await sleep(delay)

    // sleep 後再次檢查，防止在等待期間被 disconnect
    if (!this.shouldReconnect) {
      return
    }

    this.connect()
  }
}
