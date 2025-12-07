/**
 * AutoActionInputPort - Input Port
 *
 * @description
 * 自動操作 Use Case 的輸入 Port。
 * 用於操作超時時的自動代管機制。
 *
 * @module server/application/ports/input/autoActionInputPort
 */

import type { FlowState } from '#shared/contracts'

/**
 * 自動操作輸入參數
 */
export interface AutoActionInput {
  /** 遊戲 ID */
  readonly gameId: string
  /** 玩家 ID（超時的玩家） */
  readonly playerId: string
  /** 目前流程狀態 */
  readonly currentFlowState: FlowState
}

/**
 * 自動操作 Input Port
 */
export interface AutoActionInputPort {
  /**
   * 執行自動操作
   *
   * @param input - 自動操作參數
   */
  execute(input: AutoActionInput): Promise<void>
}
