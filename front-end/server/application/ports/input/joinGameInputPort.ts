/**
 * JoinGameInputPort - Input Port
 *
 * @description
 * Application Layer 定義的加入遊戲介面。
 * Use Case 實作此介面，Adapter Layer (Controllers) 依賴此介面。
 *
 * @module server/application/ports/input/joinGameInputPort
 */

import type {
  JoinGameInput,
  JoinGameOutput,
} from '~~/server/application/use-cases/joinGameUseCase'

/**
 * 加入遊戲 Input Port
 *
 * Application Layer 定義的介面，由 JoinGameUseCase 實作。
 * Adapter Layer (REST Controller, OpponentService) 依賴此介面。
 */
export interface JoinGameInputPort {
  /**
   * 執行加入遊戲用例
   *
   * @param input - 加入遊戲參數
   * @returns 遊戲資訊
   */
  execute(input: JoinGameInput): Promise<JoinGameOutput>
}
