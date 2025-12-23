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

import type { OperationSessionManager } from '../abort'
import type { ExecuteOptions, EventHandlerPort } from '~/user-interface/application/ports/input'
import type { SSEEventType } from '#shared/contracts'

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
 *
 * **注意**：SSE 連線管理由 Adapter 層負責（SSEConnectionManager）。
 * 在呼叫 clearEventChain() 前，SSE 應已斷開，因此不會有舊事件需要過濾。
 */
export class EventRouter {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handlers: Map<SSEEventType, EventHandlerPort<any>>

  /**
   * 事件處理鏈，用於序列化事件處理
   * @private
   */
  private eventChain: Promise<void> = Promise.resolve()

  /**
   * OperationSessionManager 用於取得 AbortSignal
   * @private
   */
  private operationSession: OperationSessionManager | null = null

  constructor() {
    this.handlers = new Map()
  }

  /**
   * 設置 OperationSessionManager
   *
   * @description
   * 由 DI 在註冊後設置，用於在 route() 時傳遞 AbortSignal 給 Use Case。
   */
  setOperationSession(session: OperationSessionManager): void {
    this.operationSession = session
  }

  /**
   * 註冊事件處理器
   *
   * @param eventType - SSE 事件類型 (例如 'GameStarted')
   * @param port - Event Handler Port 實例
   *
   * @example
   * ```typescript
   * router.register('GameStarted', handleGameStartedPort)
   * ```
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register(eventType: SSEEventType, port: EventHandlerPort<any>): void {
    this.handlers.set(eventType, port)
  }

  /**
   * 路由事件到對應的 Event Handler Port
   *
   * @param eventType - SSE 事件類型
   * @param payload - 事件 payload
   *
   * @description
   * 如果事件類型未註冊,記錄警告但不拋出異常。
   * 如果 Event Handler Port 執行失敗,錯誤會向上傳播。
   *
   * **序列化處理**：
   * 事件會被加入 Promise 鏈中，確保前一個事件的 Use Case（包括動畫）
   * 完全執行完畢後才開始處理下一個事件。這避免了動畫衝突問題。
   *
   * **ExecuteOptions 傳遞**：
   * 包含 receivedAt 時間戳，讓 Use Case 可以計算事件處理延遲，調整倒數計時。
   *
   * **取消機制**：
   * AbortSignal 由 Adapter 層內部管理（OperationSessionManager），
   * 不傳遞給 Application Layer，符合 Clean Architecture 依賴規則。
   *
   * @example
   * ```typescript
   * router.route('GameStarted', { game_id: '123', ... })
   * router.route('RoundDealt', { ... })  // 會等待 GameStarted 處理完畢
   * ```
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  route(eventType: SSEEventType, payload: any): void {
    const port = this.handlers.get(eventType)

    if (!port) {
      console.warn(`[EventRouter] 未註冊的事件類型: ${eventType}`)
      return
    }

    // 記錄事件收到的時間戳
    const receivedAt = Date.now()

    // 組裝 ExecuteOptions（不包含 signal，符合 CA 原則）
    const options: ExecuteOptions = { receivedAt }

    // 將事件加入處理鏈，等待前一個事件完成
    this.eventChain = this.eventChain
      .then(() => {
        // 檢查是否已取消（Adapter 層內部邏輯）
        if (this.operationSession?.getSignal()?.aborted) {
          console.info(`[EventRouter] Skipping aborted event: ${eventType}`)
          return
        }
        console.info(`[EventRouter] Processing event: ${eventType}`)
        // 調用 Use Case 執行（可能包含 async 動畫），傳遞 ExecuteOptions
        return port.execute(payload, options)
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
  unregister(eventType: SSEEventType): void {
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
   * 用於狀態恢復時，重置 Promise chain，新事件將從乾淨的起點開始。
   *
   * **前置條件**：呼叫此方法前，SSE 連線應已斷開。
   * 這由 Adapter 層（SSEConnectionManager）負責確保。
   *
   * @example
   * ```typescript
   * // 1. 先斷開 SSE
   * gameEventClient.disconnect()
   * // 2. 再清空事件鏈
   * router.clearEventChain()
   * ```
   */
  clearEventChain(): void {
    this.eventChain = Promise.resolve()
    console.info('[EventRouter] Clearing event chain')
  }

  /**
   * 等待所有待處理的事件完成
   *
   * @description
   * 返回一個 Promise，當所有排隊的事件都處理完畢時 resolve。
   * 主要用於測試，確保所有事件都已處理完畢。
   *
   * @example
   * ```typescript
   * router.route('GameStarted', payload)
   * await router.waitForPendingEvents()  // 等待事件處理完成
   * ```
   */
  waitForPendingEvents(): Promise<void> {
    return this.eventChain
  }
}
