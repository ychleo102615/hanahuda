/**
 * ExecuteOptions - 事件執行選項
 *
 * @description
 * 定義事件處理器執行時所需的上下文資訊。
 * 由 Application Layer 定義，供 Adapter Layer 實作時傳入。
 *
 * @example
 * ```typescript
 * execute(event: GameStartedEvent, options: ExecuteOptions): void {
 *   const delta = Date.now() - options.receivedAt
 *   // 根據延遲調整邏輯
 * }
 * ```
 */
export interface ExecuteOptions {
  /**
   * 前端收到事件的時間戳（毫秒）
   *
   * @description
   * EventRouter 在收到 SSE 事件時記錄的時間戳。
   * UseCase 可以用來計算事件處理延遲，調整倒數計時等。
   */
  readonly receivedAt: number
}
