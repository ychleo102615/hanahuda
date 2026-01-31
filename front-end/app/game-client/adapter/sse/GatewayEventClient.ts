/**
 * GatewayEventClient - SSE 事件客戶端
 *
 * @description
 * 使用 EventSource API 建立 SSE 連線，接收 Server → Client 的事件。
 * Client → Server 的命令改由 REST API (GameApiClient) 處理。
 *
 * 包含自動重連機制（指數退避，最多 5 次）。
 *
 * Gateway Architecture:
 * - SSE 連線：/api/v1/events
 * - 身份驗證：透過 session_id Cookie（withCredentials: true）
 * - 事件格式：GatewayEvent（包含 domain, type, payload）
 * - 初始事件：GatewayConnected（包含玩家狀態）
 *
 * @module app/game-client/adapter/sse/GatewayEventClient
 */

import type { GatewayEvent } from '#shared/contracts'
import { GATEWAY_SSE_EVENT_TYPES } from '#shared/contracts'
import type { GatewayEventRouter } from '../router/GatewayEventRouter'

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
  private shouldReconnect = false

  // 預期斷線標記（遊戲正常結束時，前端主動斷線）
  private expectingDisconnect = false

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
   * 建立 SSE 連線
   *
   * @description
   * 連線到 `/api/v1/events`，使用 Cookie 認證。
   * 連線成功後會收到 GatewayConnected 事件，包含玩家目前狀態。
   */
  connect(): void {
    // 啟用重連機制
    this.shouldReconnect = true

    const url = '/api/v1/events'

    try {
      this.eventSource = new EventSource(url, { withCredentials: true })

      // 保存當前 EventSource 實例的引用
      const currentES = this.eventSource

      // 連線建立成功
      this.eventSource.onopen = () => {
        this.reconnectAttempts = 0
        this.onConnectionEstablishedCallback?.()
      }

      // 註冊所有 Gateway SSE 事件類型的監聽器
      for (const sseEventType of GATEWAY_SSE_EVENT_TYPES) {
        // SSE 事件名稱格式：domain:type
        // 遊戲事件：GAME:GameStarted, GAME:RoundDealt, etc.
        // 配對事件：MATCHMAKING:MatchFound, etc.
        // 特殊事件：GAME:GatewayConnected

        // 註冊 GAME domain
        this.eventSource.addEventListener(`GAME:${sseEventType}`, (messageEvent: MessageEvent) => {
          this.handleSSEMessage(messageEvent)
        })

        // 註冊 MATCHMAKING domain
        this.eventSource.addEventListener(`MATCHMAKING:${sseEventType}`, (messageEvent: MessageEvent) => {
          this.handleSSEMessage(messageEvent)
        })
      }

      // 連線錯誤（SSE 會自動重連，但我們自行管理重連）
      this.eventSource.onerror = () => {
        // 只有當 EventSource 的 readyState 是 CLOSED (2) 才代表連線斷開
        if (currentES.readyState === EventSource.CLOSED) {
          this.handleDisconnect(currentES)
        }
        // readyState === CONNECTING (0) 表示 EventSource 正在嘗試重連
        // 我們不干預，等待它自行處理
      }
    } catch {
      this.onConnectionFailedCallback?.()
    }
  }

  /**
   * 處理 SSE 連線斷開
   */
  private handleDisconnect(closedES: EventSource): void {
    // 關鍵檢查：如果 this.eventSource 已經是不同的實例（forceReconnect 建立了新連線），
    // 則忽略這個舊連線的事件
    if (this.eventSource !== closedES) {
      return
    }

    // 預期斷線（遊戲正常結束）：不觸發重連
    if (this.expectingDisconnect) {
      this.expectingDisconnect = false
      this.shouldReconnect = false
      this.closeEventSource()
      return
    }

    // 非預期斷線：清除 eventSource 並觸發重連
    this.closeEventSource()
    this.onConnectionLostCallback?.()
    void this.reconnect()
  }

  /**
   * 斷開 SSE 連線
   */
  disconnect(): void {
    this.shouldReconnect = false
    this.reconnectAttempts = 0
    this.closeEventSource()

    // 清空事件處理鏈，防止舊事件繼續處理
    this.eventRouter.clearEventChain()
  }

  /**
   * 檢查是否已連線
   */
  isConnected(): boolean {
    return this.eventSource !== null && this.eventSource.readyState === EventSource.OPEN
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
   * 設定預期斷線標記
   *
   * @description
   * 當遊戲正常結束時，前端收到 GameFinished 事件後設置此標記，
   * 然後主動斷線，不需要嘗試重連。
   */
  setExpectingDisconnect(expecting: boolean): void {
    this.expectingDisconnect = expecting
  }

  /**
   * 強制重新連線（斷開現有連線並建立新連線）
   *
   * @description
   * 用於頁面可見性恢復等場景，確保連線狀態與後端同步。
   */
  forceReconnect(): void {
    // 如果有現有連線，先安全關閉
    if (this.eventSource) {
      this.expectingDisconnect = true
      this.closeEventSource()
      this.eventRouter.clearEventChain()
    }

    // 重置重連計數
    this.reconnectAttempts = 0

    // 建立新連線
    this.connect()
  }

  /**
   * 處理 SSE 訊息
   * @private
   */
  private handleSSEMessage(messageEvent: MessageEvent): void {
    try {
      const gatewayEvent: GatewayEvent = JSON.parse(messageEvent.data)
      this.eventRouter.route(gatewayEvent)
    } catch {
      // 忽略 JSON 解析錯誤
    }
  }

  /**
   * 關閉 EventSource
   * @private
   */
  private closeEventSource(): void {
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }
  }

  /**
   * 自動重連機制（指數退避）
   * @private
   */
  private async reconnect(): Promise<void> {
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
