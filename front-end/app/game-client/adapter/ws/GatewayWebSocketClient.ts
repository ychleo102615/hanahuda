/**
 * GatewayWebSocketClient - 統一 Gateway WebSocket 客戶端
 *
 * @description
 * 使用原生 WebSocket API 建立 Gateway 連線，處理雙向通訊。
 * - 接收：Server → Client 的 GatewayEvent 事件
 * - 發送：Client → Server 的 WsCommand 命令
 *
 * 包含自動重連機制（指數退避，最多 5 次）。
 *
 * Gateway Architecture:
 * - 單一 WebSocket 連線：/_ws
 * - 身份驗證：透過 session_id Cookie
 * - 事件格式：GatewayEvent（包含 domain, type, payload）
 * - 命令格式：WsCommand（包含 command_id, type, payload）
 * - 初始事件：GatewayConnected（包含玩家狀態）
 *
 * @example
 * ```typescript
 * const router = new GatewayEventRouter(gameRouter, matchmakingRouter)
 * const client = new GatewayWebSocketClient(router)
 * client.connect()
 *
 * // 發送命令
 * const response = await client.sendCommand({
 *   command_id: '123',
 *   type: 'PLAY_CARD',
 *   payload: { game_id: 'xxx', card_id: '0101' }
 * })
 * ```
 *
 * @module app/game-client/adapter/ws/GatewayWebSocketClient
 */

import type { GatewayEvent, WsCommand, WsCommandResponse } from '#shared/contracts'
import { isWsCommandResponse, createPingCommand } from '#shared/contracts'
import type { GatewayEventRouter } from './GatewayEventRouter'

/**
 * 產生唯一命令 ID（供 Heartbeat 使用）
 */
function generateCommandId(): string {
  return `cmd-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * 睡眠輔助函數
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 命令超時錯誤
 */
export class CommandTimeoutError extends Error {
  override readonly name = 'CommandTimeoutError'
  readonly commandId: string

  constructor(commandId: string) {
    super(`Command timeout: ${commandId}`)
    this.commandId = commandId
    Object.setPrototypeOf(this, CommandTimeoutError.prototype)
  }
}

/**
 * 連線關閉錯誤
 */
export class ConnectionClosedError extends Error {
  override readonly name = 'ConnectionClosedError'

  constructor() {
    super('WebSocket connection closed')
    Object.setPrototypeOf(this, ConnectionClosedError.prototype)
  }
}

/**
 * 待處理命令
 */
interface PendingCommand {
  resolve: (response: WsCommandResponse) => void
  reject: (error: Error) => void
  timeoutId: ReturnType<typeof setTimeout>
}

/**
 * GatewayWebSocketClient 類別
 */
export class GatewayWebSocketClient {
  private ws: WebSocket | null = null
  private readonly eventRouter: GatewayEventRouter

  // 重連機制
  private reconnectAttempts = 0
  private readonly maxAttempts = 5
  private readonly reconnectDelays = [1000, 2000, 4000, 8000, 16000] // 指數退避
  private shouldReconnect = false // 控制重連，disconnect 時設為 false

  // 預期斷線標記（遊戲正常結束時，後端主動關閉連線）
  private expectingDisconnect = false

  // 命令超時時間
  private readonly commandTimeout: number

  // 待處理命令 Map
  private pendingCommands = new Map<string, PendingCommand>()

  // Heartbeat 機制
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null
  private readonly heartbeatIntervalMs = 30000 // 30 秒

  // 連線狀態回調
  private onConnectionEstablishedCallback?: () => void
  private onConnectionLostCallback?: () => void
  private onConnectionFailedCallback?: () => void

  /**
   * @param eventRouter - Gateway 事件路由器實例
   * @param commandTimeout - 命令超時時間（毫秒），預設 5000
   */
  constructor(eventRouter: GatewayEventRouter, commandTimeout = 5000) {
    this.eventRouter = eventRouter
    this.commandTimeout = commandTimeout
  }

  /**
   * 建立 Gateway WebSocket 連線
   *
   * @description
   * 連線到統一的 Gateway WebSocket 端點 `/_ws`。
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

    // 建立 WebSocket URL
    const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:'
      ? 'wss:'
      : 'ws:'
    const host = typeof window !== 'undefined' ? window.location.host : 'localhost:3000'
    const url = `${protocol}//${host}/_ws`

    try {
      // WebSocket 會自動包含同源 Cookie（包含 session_id）
      this.ws = new WebSocket(url)

      // 保存當前 WebSocket 實例的引用，用於 onclose 中判斷是否為舊連線
      const currentWs = this.ws

      // 連線建立成功
      this.ws.onopen = () => {
        this.reconnectAttempts = 0
        this.startHeartbeat()
        this.onConnectionEstablishedCallback?.()
      }

      // 接收訊息
      this.ws.onmessage = (event: MessageEvent) => {
        this.handleMessage(event.data)
      }

      // 連線關閉
      this.ws.onclose = () => {
        // 關鍵檢查：如果 this.ws 已經是不同的實例（forceReconnect 建立了新連線），
        // 則忽略這個舊連線的 onclose 事件
        if (this.ws !== currentWs) {
          return
        }

        this.stopHeartbeat()
        this.rejectAllPendingCommands()

        // 預期斷線（遊戲正常結束）：不觸發重連
        if (this.expectingDisconnect) {
          this.expectingDisconnect = false // 重置標記
          this.shouldReconnect = false
          this.ws = null
          // 不呼叫 onConnectionLostCallback，因為這是預期行為
          return
        }

        // 非預期斷線：清除 ws 並觸發重連
        this.ws = null
        this.onConnectionLostCallback?.()
        void this.reconnect()
      }

      // 連線錯誤
      this.ws.onerror = () => {
        // onerror 後通常會接著 onclose，所以這裡不需要額外處理
      }
    } catch {
      this.onConnectionFailedCallback?.()
    }
  }

  /**
   * 斷開 WebSocket 連線
   *
   * @description
   * 斷開連線時會同時清空事件處理鏈和待處理命令，確保舊事件不會繼續處理。
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

    // 停止 Heartbeat
    this.stopHeartbeat()

    // 拒絕所有待處理命令
    this.rejectAllPendingCommands()

    if (this.ws) {
      this.ws.close()
      this.ws = null
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
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }

  /**
   * 發送命令並等待回應
   *
   * @param command - WebSocket 命令
   * @returns 命令回應
   * @throws {ConnectionClosedError} 當連線未建立時
   * @throws {CommandTimeoutError} 當命令超時時
   *
   * @example
   * ```typescript
   * const response = await client.sendCommand({
   *   command_id: 'cmd-123',
   *   type: 'PLAY_CARD',
   *   payload: { game_id: 'xxx', card_id: '0101' }
   * })
   * if (!response.success) {
   *   console.error(response.error)
   * }
   * ```
   */
  async sendCommand(command: WsCommand): Promise<WsCommandResponse> {
    if (!this.isConnected()) {
      throw new ConnectionClosedError()
    }

    return new Promise((resolve, reject) => {
      // 設定超時
      const timeoutId = setTimeout(() => {
        this.pendingCommands.delete(command.command_id)
        reject(new CommandTimeoutError(command.command_id))
      }, this.commandTimeout)

      // 儲存待處理命令
      this.pendingCommands.set(command.command_id, {
        resolve,
        reject,
        timeoutId,
      })

      // 發送命令
      this.ws!.send(JSON.stringify(command))
    })
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
   * 當遊戲正常結束時，後端會主動關閉 WebSocket 連線。
   * 前端收到 GameFinished 事件後設置此標記，
   * 讓 onclose 處理器知道這是預期中的斷線，不需要嘗試重連。
   *
   * @param expecting - 是否預期即將斷線
   */
  setExpectingDisconnect(expecting: boolean): void {
    this.expectingDisconnect = expecting
  }

  /**
   * 強制重新連線（斷開現有連線並建立新連線）
   *
   * @description
   * 無條件斷開現有連線並建立新連線。
   * 用於頁面可見性恢復等場景，確保連線狀態與後端同步。
   *
   * Race Condition 處理：
   * - 設置 expectingDisconnect 防止舊連線的 onclose 觸發意外重連
   * - 重置 reconnectAttempts 確保新連線有完整的重連次數
   */
  forceReconnect(): void {
    // 如果有現有連線，先安全關閉
    if (this.ws) {
      // 設置預期斷線標記，防止 onclose 觸發意外重連
      this.expectingDisconnect = true
      this.stopHeartbeat()
      this.rejectAllPendingCommands()
      this.ws.close()
      this.ws = null
      this.eventRouter.clearEventChain()
    }

    // 重置重連計數
    this.reconnectAttempts = 0

    // 建立新連線
    this.connect()
  }

  /**
   * 切換到遊戲伺服器（多實例架構）
   *
   * @description
   * 當 MatchFound 事件包含 game_server_url 和 handoff_token 時，
   * 客戶端應調用此方法切換到遊戲伺服器。
   *
   * @param serverUrl - 遊戲伺服器 WebSocket URL（例：wss://game-server-1.example.com/_ws）
   * @param token - Handoff Token
   * @returns Promise，連線成功時 resolve
   * @throws {Error} 連線失敗時 reject
   *
   * @example
   * ```typescript
   * // 收到 MatchFound 事件
   * if (event.game_server_url && event.handoff_token) {
   *   await client.handoffToGameServer(event.game_server_url, event.handoff_token)
   * }
   * ```
   */
  async handoffToGameServer(serverUrl: string, token: string): Promise<void> {
    // 停止當前連線的重連機制和心跳
    this.shouldReconnect = false
    this.stopHeartbeat()

    // 關閉當前連線
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    // 拒絕所有待處理命令
    this.rejectAllPendingCommands()

    return new Promise((resolve, reject) => {
      // 建立帶有 handoff_token 的 WebSocket URL
      const url = new URL(serverUrl)
      url.searchParams.set('handoff_token', token)

      try {
        this.ws = new WebSocket(url.toString())

        this.ws.onopen = () => {
          // 連線成功，啟用重連機制和心跳
          this.shouldReconnect = true
          this.reconnectAttempts = 0
          this.startHeartbeat()
          this.onConnectionEstablishedCallback?.()
          resolve()
        }

        this.ws.onerror = () => {
          // 連線錯誤（onclose 會接著觸發）
        }

        this.ws.onclose = () => {
          // 若 Promise 尚未 resolve，則視為連線失敗
          if (!this.shouldReconnect) {
            reject(new Error('Failed to connect to game server'))
          } else {
            // 已連線成功後斷線，觸發重連
            this.rejectAllPendingCommands()
            this.ws = null
            this.onConnectionLostCallback?.()
            void this.reconnect()
          }
        }

        this.ws.onmessage = (event: MessageEvent) => {
          this.handleMessage(event.data)
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * 處理接收到的訊息
   * @private
   */
  private handleMessage(data: string): void {
    try {
      const message: unknown = JSON.parse(data)

      // 區分事件和命令回應
      if (isWsCommandResponse(message)) {
        // 命令回應
        this.handleCommandResponse(message)
      } else {
        // 遊戲事件
        this.eventRouter.route(message as GatewayEvent)
      }
    } catch {
      // 忽略 JSON 解析錯誤
    }
  }

  /**
   * 處理命令回應
   * @private
   */
  private handleCommandResponse(response: WsCommandResponse): void {
    const pending = this.pendingCommands.get(response.response_to)
    if (pending) {
      clearTimeout(pending.timeoutId)
      this.pendingCommands.delete(response.response_to)
      pending.resolve(response)
    }
  }

  /**
   * 拒絕所有待處理命令
   * @private
   */
  private rejectAllPendingCommands(): void {
    const error = new ConnectionClosedError()
    for (const [, pending] of this.pendingCommands) {
      clearTimeout(pending.timeoutId)
      pending.reject(error)
    }
    this.pendingCommands.clear()
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

  /**
   * 啟動 Heartbeat 機制
   *
   * @description
   * 定期發送 PING 命令，確保連線活躍。
   * 若 PING 失敗，觸發連線關閉以啟動重連。
   *
   * @private
   */
  private startHeartbeat(): void {
    this.stopHeartbeat()

    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        const pingCommand = createPingCommand(generateCommandId())
        this.sendCommand(pingCommand).catch(() => {
          // Heartbeat 失敗，可能連線已靜默斷開，觸發重連
          console.warn('[GatewayWebSocketClient] Heartbeat failed, closing connection')
          this.ws?.close()
        })
      }
    }, this.heartbeatIntervalMs)
  }

  /**
   * 停止 Heartbeat 機制
   * @private
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }
}
