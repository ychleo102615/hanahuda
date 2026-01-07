/**
 * MatchmakingEventClient - 配對 SSE 客戶端
 *
 * @description
 * 使用原生 EventSource API 建立配對 SSE 連線，接收配對事件並路由到對應的 Input Port。
 * 參照 GameEventClient 設計，只負責 SSE 連線管理。
 *
 * 關鍵設計：
 * - 使用 addEventListener 監聽命名事件（而非 onmessage）
 * - 透過 MatchmakingEventRouter 路由事件到 Input Ports
 * - 配對 SSE 不需要自動重連，由上層處理
 *
 * @example
 * ```typescript
 * const router = new MatchmakingEventRouter()
 * const client = new MatchmakingEventClient(router)
 * client.connect('entry-123')
 * ```
 *
 * @module app/user-interface/adapter/sse/MatchmakingEventClient
 */

import { SSE_MATCHMAKING_EVENT_TYPES, type MatchmakingSSEEventType } from '#shared/contracts'
import type { MatchmakingEventRouter } from './MatchmakingEventRouter'

/**
 * MatchmakingEventClient 類別
 */
export class MatchmakingEventClient {
  private eventSource: EventSource | null = null
  private entryId: string | null = null

  // 連線狀態回調
  private onConnectionEstablishedCallback?: () => void
  private onConnectionLostCallback?: () => void
  private onConnectionFailedCallback?: () => void

  /**
   * @param eventRouter - 配對事件路由器實例
   */
  constructor(private readonly eventRouter: MatchmakingEventRouter) {}

  /**
   * 建立配對 SSE 連線
   *
   * @param entryId - 配對條目 ID（從 POST /matchmaking/enter 取得）
   */
  connect(entryId: string): void {
    // 保存 entryId
    this.entryId = entryId

    // 關閉現有連線
    this.disconnect()

    // 構建 URL
    const url = `/api/v1/matchmaking/status?entry_id=${encodeURIComponent(entryId)}`

    try {
      // EventSource 會自動包含同源 Cookie（包含 session_token）
      this.eventSource = new EventSource(url, { withCredentials: true })

      // 連線建立成功
      this.eventSource.onopen = () => {
        this.onConnectionEstablishedCallback?.()
      }

      // 連線錯誤
      this.eventSource.onerror = () => {
        this.eventSource?.close()
        this.eventSource = null
        this.onConnectionLostCallback?.()
        // 配對 SSE 不需要自動重連，由上層 composable 處理
      }

      // 註冊所有命名事件監聽器
      this.registerEventListeners()
    } catch {
      this.onConnectionFailedCallback?.()
    }
  }

  /**
   * 斷開 SSE 連線
   */
  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }
    this.entryId = null
  }

  /**
   * 檢查是否已連線
   */
  isConnected(): boolean {
    return (
      this.eventSource !== null &&
      this.eventSource.readyState === EventSource.OPEN
    )
  }

  /**
   * 取得目前的 entry ID
   */
  getEntryId(): string | null {
    return this.entryId
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
   * 設定連線失敗回調
   */
  onConnectionFailed(callback: () => void): void {
    this.onConnectionFailedCallback = callback
  }

  /**
   * 註冊所有 SSE 命名事件監聯器
   * @private
   */
  private registerEventListeners(): void {
    if (!this.eventSource) return

    SSE_MATCHMAKING_EVENT_TYPES.forEach((eventType) => {
      this.eventSource!.addEventListener(eventType, (event: MessageEvent) => {
        try {
          const payload = JSON.parse(event.data)
          this.eventRouter.route(eventType as MatchmakingSSEEventType, payload)
        } catch {
          // 忽略 JSON 解析錯誤
        }
      })
    })
  }
}
