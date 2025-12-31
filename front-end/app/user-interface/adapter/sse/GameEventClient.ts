/**
 * GameEventClient - SSE 客戶端
 *
 * @description
 * 使用原生 EventSource API 建立 SSE 連線，接收遊戲事件並路由到對應的 Input Port。
 * 包含自動重連機制（指數退避，最多 5 次）。
 *
 * SSE-First Architecture:
 * - 連線即觸發 join/reconnect（由後端處理）
 * - 第一個事件永遠是 InitialState
 * - 前端根據 response_type 決定顯示邏輯
 *
 * 參考契約: specs/004-ui-adapter-layer/contracts/sse-client.md
 *
 * @example
 * ```typescript
 * const router = new EventRouter()
 * const client = new GameEventClient('http://localhost:8080', router)
 * client.connect({ playerId: 'player-1', playerName: 'Alice' })
 * ```
 */

import { EventRouter } from './EventRouter'
import { SSE_EVENT_TYPES } from '#shared/contracts'

/**
 * SSE 連線參數
 */
export interface SSEConnectionParams {
  /** 玩家 ID */
  playerId: string
  /** 玩家名稱 */
  playerName: string
  /** 遊戲 ID（可選，有值表示重連） */
  gameId?: string | null
  /** 房間類型 ID（可選，新遊戲時指定） */
  roomTypeId?: string | null
}

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
  private shouldReconnect = false // 控制重連，disconnect 時設為 false

  // 連線狀態回調
  private onConnectionEstablishedCallback?: () => void
  private onConnectionLostCallback?: () => void
  private onConnectionFailedCallback?: () => void

  // 保存連線參數用於重連
  private lastConnectionParams: SSEConnectionParams | null = null

  /**
   * @param baseURL - API 伺服器基礎 URL
   * @param eventRouter - 事件路由器實例
   */
  constructor(baseURL: string, eventRouter: EventRouter) {
    this.baseURL = baseURL
    this.eventRouter = eventRouter
  }

  /**
   * 建立 SSE 連線（SSE-First Architecture）
   *
   * @param params - 連線參數
   *
   * @description
   * 連線到統一的 SSE 端點。後端會自動處理 join/reconnect 邏輯，
   * 並推送 InitialState 作為第一個事件。
   *
   * @note session_token 由 HttpOnly Cookie 自動傳送，無需手動傳遞
   *
   * @example
   * ```typescript
   * // 新遊戲
   * client.connect({ playerId: 'player-1', playerName: 'Alice' })
   *
   * // 重連
   * client.connect({ playerId: 'player-1', playerName: 'Alice', gameId: 'game-123' })
   * ```
   */
  connect(params: SSEConnectionParams): void {
    // 保存參數用於重連
    this.lastConnectionParams = params

    // 啟用重連機制
    this.shouldReconnect = true

    // 構建 URL
    const queryParams = new URLSearchParams({
      player_id: params.playerId,
      player_name: params.playerName,
    })
    if (params.gameId) {
      queryParams.set('game_id', params.gameId)
    }
    if (params.roomTypeId) {
      queryParams.set('room_type', params.roomTypeId)
    }
    const url = `${this.baseURL}/api/v1/games/connect?${queryParams.toString()}`

    try {
      // EventSource 會自動包含同源 Cookie（包含 session_token）
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

      // 註冊所有事件監聯器
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
   * 註冊所有 SSE 事件監聽器
   * @private
   */
  private registerEventListeners(): void {
    if (!this.eventSource) return

    SSE_EVENT_TYPES.forEach((eventType) => {
      this.eventSource!.addEventListener(eventType, (event: MessageEvent) => {
        try {
          const payload = JSON.parse(event.data)
          this.eventRouter.route(eventType, payload)
        } catch {
          // 忽略 JSON 解析錯誤
        }
      })
    })
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

    if (!this.lastConnectionParams) {
      this.onConnectionFailedCallback?.()
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

    this.connect(this.lastConnectionParams)
  }
}
