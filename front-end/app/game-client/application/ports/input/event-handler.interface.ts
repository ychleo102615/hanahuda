/**
 * EventHandlerPort - 通用事件處理器介面
 *
 * @description
 * 定義所有事件處理器 Input Port 的通用介面。
 * 由 Application Layer 定義，Adapter Layer（EventRouter）依賴此介面。
 *
 * 所有具體的事件處理器 Port（如 HandleGameStartedPort）都應該
 * 遵循此介面的 execute 方法簽名。
 *
 * @typeParam T - 事件 payload 類型
 *
 * @example
 * ```typescript
 * // 定義具體的 Port
 * export interface HandleGameStartedPort extends EventHandlerPort<GameStartedEvent> {}
 *
 * // 實作 UseCase
 * export class HandleGameStartedUseCase implements HandleGameStartedPort {
 *   execute(event: GameStartedEvent, options: ExecuteOptions): void {
 *     // 處理邏輯
 *   }
 * }
 * ```
 */

import type { ExecuteOptions } from './execute-options'

/**
 * 事件處理器 Input Port 介面
 */
export interface EventHandlerPort<T> {
  /**
   * 執行事件處理
   *
   * @param event - 事件 payload
   * @param options - 執行選項（包含 signal 和 receivedAt）
   * @returns void 或 Promise<void>（支援同步/非同步處理）
   */
  execute(event: T, options: ExecuteOptions): void | Promise<void>
}
