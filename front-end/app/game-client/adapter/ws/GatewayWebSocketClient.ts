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
import { isWsCommandResponse } from '#shared/contracts'
import type { GatewayEventRouter } from './GatewayEventRouter'

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

  // 命令超時時間
  private readonly commandTimeout: number

  // 待處理命令 Map
  private pendingCommands = new Map<string, PendingCommand>()

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

      // 連線建立成功
      this.ws.onopen = () => {
        this.reconnectAttempts = 0
        this.onConnectionEstablishedCallback?.()
      }

      // 接收訊息
      this.ws.onmessage = (event: MessageEvent) => {
        this.handleMessage(event.data)
      }

      // 連線關閉
      this.ws.onclose = () => {
        this.rejectAllPendingCommands()
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
}
