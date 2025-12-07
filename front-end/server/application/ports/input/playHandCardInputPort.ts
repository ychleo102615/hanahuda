/**
 * PlayHandCardInputPort - Input Port
 *
 * @description
 * Application Layer 定義的打手牌介面。
 * Use Case 實作此介面，Adapter Layer (Controllers) 依賴此介面。
 *
 * @module server/application/ports/input/playHandCardInputPort
 */

import type {
  PlayHandCardInput,
  PlayHandCardOutput,
} from '~~/server/application/use-cases/playHandCardUseCase'

/**
 * 打手牌 Input Port
 *
 * Application Layer 定義的介面，由 PlayHandCardUseCase 實作。
 * Adapter Layer (REST Controller, OpponentService) 依賴此介面。
 */
export interface PlayHandCardInputPort {
  /**
   * 執行打手牌用例
   *
   * @param input - 打手牌參數
   * @returns 結果
   */
  execute(input: PlayHandCardInput): Promise<PlayHandCardOutput>
}
