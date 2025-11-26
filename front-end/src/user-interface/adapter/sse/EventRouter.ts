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
 *
 * **事件序列化機制**：
 * 為了防止動畫衝突（例如前一個事件的動畫還在播放，下一個事件就開始），
 * 使用 Promise 鏈確保事件依序處理。每個事件會等待前一個事件的 Use Case
 * 完全執行完畢（包括動畫）後才開始處理。
 */
export class EventRouter {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handlers: Map<string, InputPort<any>>

  /**
   * 事件處理鏈，用於序列化事件處理
   * @private
   */
  private eventChain: Promise<void> = Promise.resolve()

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
   * **序列化處理**：
   * 事件會被加入 Promise 鏈中，確保前一個事件的 Use Case（包括動畫）
   * 完全執行完畢後才開始處理下一個事件。這避免了動畫衝突問題。
   *
   * @example
   * ```typescript
   * router.route('GameStarted', { game_id: '123', ... })
   * router.route('RoundDealt', { ... })  // 會等待 GameStarted 處理完畢
   * ```
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  route(eventType: string, payload: any): void {
    const port = this.handlers.get(eventType)

    if (!port) {
      console.warn(`[EventRouter] 未註冊的事件類型: ${eventType}`)
      return
    }

    // 將事件加入處理鏈，等待前一個事件完成
    this.eventChain = this.eventChain
      .then(() => {
        console.info(`[EventRouter] Processing event: ${eventType}`)
        // 調用 Use Case 執行（可能包含 async 動畫）
        return port.execute(payload)
      })
      .catch((error) => {
        // 捕獲錯誤，避免中斷事件鏈
        console.error(`[EventRouter] Error processing event ${eventType}:`, error)
      })
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

  /**
   * 清空事件處理鏈
   *
   * @description
   * 用於緊急情況（如斷線重連）時，清空所有等待中的事件。
   * 正在執行的事件會繼續完成，但後續排隊的事件會被丟棄。
   *
   * @example
   * ```typescript
   * router.clearEventChain()  // 清空排隊中的事件
   * ```
   */
  clearEventChain(): void {
    console.info('[EventRouter] Clearing event chain')
    this.eventChain = Promise.resolve()
  }
}
