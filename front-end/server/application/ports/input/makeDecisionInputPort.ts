/**
 * MakeDecisionInputPort - Input Port
 *
 * @description
 * Application Layer 定義的 Koi-Koi 決策介面。
 * Use Case 實作此介面，Adapter Layer (Controllers) 依賴此介面。
 *
 * @module server/application/ports/input/makeDecisionInputPort
 */

import type {
  MakeDecisionInput,
  MakeDecisionOutput,
} from '~~/server/application/use-cases/makeDecisionUseCase'

/**
 * Koi-Koi 決策 Input Port
 *
 * Application Layer 定義的介面，由 MakeDecisionUseCase 實作。
 * Adapter Layer (REST Controller, OpponentService) 依賴此介面。
 */
export interface MakeDecisionInputPort {
  /**
   * 執行 Koi-Koi 決策用例
   *
   * @param input - 決策參數
   * @returns 結果
   */
  execute(input: MakeDecisionInput): Promise<MakeDecisionOutput>
}
