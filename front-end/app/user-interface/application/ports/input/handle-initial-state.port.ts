/**
 * HandleInitialStatePort - Input Port
 *
 * @description
 * 處理 SSE 連線後的第一個事件 InitialState。
 * 統一處理新遊戲加入和斷線重連的情境。
 *
 * 根據 response_type 決定處理方式：
 * - game_waiting: 顯示等待對手畫面
 * - game_started: 設定初始狀態，準備接收 RoundDealt
 * - snapshot: 恢復進行中的遊戲狀態（無動畫）
 * - game_finished: 顯示遊戲結果，導航回大廳
 * - game_expired: 顯示錯誤訊息，導航回大廳
 *
 * 實作: HandleInitialStateUseCase
 *
 * @module user-interface/application/ports/input/handle-initial-state.port
 */

import type { InitialStateEvent } from '#shared/contracts'

/**
 * HandleInitialStatePort - Input Port
 *
 * @description
 * 使用 abstract class 定義介面，防止 duck typing。
 * Adapter Layer（SSE EventRouter）呼叫此 Port。
 */
export abstract class HandleInitialStatePort {
  /**
   * 執行 InitialState 事件處理
   *
   * @param event - InitialState 事件
   * @param signal - AbortSignal（可選），用於取消操作
   */
  abstract execute(event: InitialStateEvent, signal?: AbortSignal): void | Promise<void>
}
