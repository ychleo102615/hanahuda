/**
 * SelectTargetInputPort - Input Port
 *
 * @description
 * Application Layer 定義的選擇配對目標介面。
 * Use Case 實作此介面，Adapter Layer (Controllers) 依賴此介面。
 *
 * @module server/application/ports/input/selectTargetInputPort
 */

import type {
  SelectTargetInput,
  SelectTargetOutput,
} from '~~/server/application/use-cases/selectTargetUseCase'

/**
 * 選擇配對目標 Input Port
 *
 * Application Layer 定義的介面，由 SelectTargetUseCase 實作。
 * Adapter Layer (REST Controller, OpponentService) 依賴此介面。
 */
export interface SelectTargetInputPort {
  /**
   * 執行選擇配對目標用例
   *
   * @param input - 選擇參數
   * @returns 結果
   */
  execute(input: SelectTargetInput): Promise<SelectTargetOutput>
}
