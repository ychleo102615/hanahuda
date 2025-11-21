/**
 * EventRouter - SSE 事件路由器
 *
 * @description
 * 將 SSE 事件類型映射到對應的 Input Port,負責事件分發。
 * 參考契約: specs/004-ui-adapter-layer/contracts/sse-client.md
 *
 * @example
 * ```typescript
 * const router = new EventRouter()
 * router.register('GameStarted', handleGameStartedPort)
 * router.route('GameStarted', payload)
 * ```
 */

/**
 * 通用 Input Port 介面
 */
 
interface InputPort<T = unknown> {
  execute(payload: T): void
}

/**
 * EventRouter 類別
 *
 * @description
 * 使用 Map 儲存事件類型與 Input Port 的映射關係。
 * 支援註冊、路由、取消註冊、清除等操作。
 */
export class EventRouter {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handlers: Map<string, InputPort<any>>

  constructor() {
    this.handlers = new Map()
  }

  /**
   * 註冊事件處理器
   *
   * @param eventType - SSE 事件類型 (例如 'GameStarted')
   * @param port - Input Port 實例
   *
   * @example
   * ```typescript
   * router.register('GameStarted', handleGameStartedPort)
   * ```
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register(eventType: string, port: InputPort<any>): void {
    this.handlers.set(eventType, port)
  }

  /**
   * 路由事件到對應的 Input Port
   *
   * @param eventType - SSE 事件類型
   * @param payload - 事件 payload
   *
   * @description
   * 如果事件類型未註冊,記錄警告但不拋出異常。
   * 如果 Input Port 執行失敗,錯誤會向上傳播。
   *
   * @example
   * ```typescript
   * router.route('GameStarted', { game_id: '123', ... })
   * ```
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  route(eventType: string, payload: any): void {
    const port = this.handlers.get(eventType)

    if (port) {
      port.execute(payload)
    } else {
      console.warn(`未註冊的事件類型: ${eventType}`)
    }
  }

  /**
   * 取消註冊事件處理器
   *
   * @param eventType - SSE 事件類型
   *
   * @example
   * ```typescript
   * router.unregister('GameStarted')
   * ```
   */
  unregister(eventType: string): void {
    this.handlers.delete(eventType)
  }

  /**
   * 清除所有事件處理器
   *
   * @example
   * ```typescript
   * router.clear()
   * ```
   */
  clear(): void {
    this.handlers.clear()
  }
}
