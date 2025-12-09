/**
 * GameEventClient - SSE 客戶端
 *
 * @description
 * 使用原生 EventSource API 建立 SSE 連線,接收遊戲事件並路由到對應的 Input Port。
 * 包含自動重連機制 (指數退避,最多 5 次)。
 *
 * 參考契約: specs/004-ui-adapter-layer/contracts/sse-client.md
 *
 * @example
 * ```typescript
 * const router = new EventRouter()
 * const client = new GameEventClient('http://localhost:8080', router)
 * client.connect('game-123', 'token-456')
 * ```
 */

import { EventRouter } from './EventRouter'

/**
 * SSE 支援的事件類型
 */
const SSE_EVENT_TYPES = [
  'GameStarted',
  'RoundDealt',
  'TurnCompleted',
  'SelectionRequired',
  'TurnProgressAfterSelection',
  'DecisionRequired',
  'DecisionMade',
  'YakuFormed',
  'RoundScored',
  'RoundEndedInstantly',
  'RoundDrawn',
  'GameFinished',
  'TurnError',
  'GameSnapshotRestore',
] as const

/**
 * 睡眠輔助函數
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * GameEventClient 類別
 */
export class GameEventClient {
  private readonly baseURL: string
  private readonly eventRouter: EventRouter
  private eventSource: EventSource | null = null

  // 重連機制
  private reconnectAttempts = 0
  private readonly maxAttempts = 5
  private readonly reconnectDelays = [1000, 2000, 4000, 8000, 16000] // 指數退避

  // 連線狀態回調
  private onConnectionEstablishedCallback?: () => void
  private onConnectionLostCallback?: () => void
  private onConnectionFailedCallback?: () => void

  /**
   * @param baseURL - API 伺服器基礎 URL
   * @param eventRouter - 事件路由器實例
   */
  constructor(baseURL: string, eventRouter: EventRouter) {
    this.baseURL = baseURL
    this.eventRouter = eventRouter
  }

  /**
   * 建立 SSE 連線
   *
   * @param gameId - 遊戲 ID
   *
   * @note session_token 由 HttpOnly Cookie 自動傳送，無需手動傳遞
   *
   * @example
   * ```typescript
   * client.connect('game-123')
   * ```
   */
  connect(gameId: string): void {
    // session_token 由 Cookie 自動傳送，不再需要 query parameter
    const url = `${this.baseURL}/api/v1/games/${gameId}/events`

    try {
      // EventSource 會自動包含同源 Cookie（包含 session_token）
      this.eventSource = new EventSource(url, { withCredentials: true })

      // 連線建立成功
      this.eventSource.onopen = () => {
        console.info('[SSE] 連線已建立', { gameId })
        this.reconnectAttempts = 0
        this.onConnectionEstablishedCallback?.()
      }

      // 連線錯誤或中斷
      this.eventSource.onerror = (event) => {
        console.error('[SSE] 連線錯誤', event)
        this.eventSource?.close()
        this.eventSource = null
        this.onConnectionLostCallback?.()
        void this.reconnect(gameId)
      }

      // 註冊所有事件監聽器
      this.registerEventListeners()
    } catch (error) {
      console.error('[SSE] 建立連線失敗', error)
      this.onConnectionFailedCallback?.()
    }
  }

  /**
   * 斷開 SSE 連線
   *
   * @example
   * ```typescript
   * client.disconnect()
   * ```
   */
  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
      console.info('[SSE] 連線已斷開')
    }
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
   * 註冊所有 SSE 事件監聽器
   * @private
   */
  private registerEventListeners(): void {
    if (!this.eventSource) return

    SSE_EVENT_TYPES.forEach((eventType) => {
      this.eventSource!.addEventListener(eventType, (event: MessageEvent) => {
        try {
          const payload = JSON.parse(event.data)
          console.info(`[SSE] 接收事件: ${eventType}`, payload)
          this.eventRouter.route(eventType, payload)
        } catch (error) {
          console.error(`[SSE] 事件解析失敗: ${eventType}`, {
            data: event.data,
            error,
          })
        }
      })
    })
  }

  /**
   * 自動重連機制 (指數退避)
   * @private
   */
  private async reconnect(gameId: string): Promise<void> {
    if (this.reconnectAttempts >= this.maxAttempts) {
      console.error(
        `[SSE] 重連失敗，達到最大嘗試次數 (${this.maxAttempts})`
      )
      this.onConnectionFailedCallback?.()
      return
    }

    const delay = this.reconnectDelays[this.reconnectAttempts] ?? 16000
    this.reconnectAttempts++

    console.warn(
      `[SSE] 重連中... (嘗試 ${this.reconnectAttempts}/${this.maxAttempts})，等待 ${delay}ms`
    )

    await sleep(delay)
    this.connect(gameId)
  }
}
