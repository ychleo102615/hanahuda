/**
 * MakeDecisionInputPort - Input Port
 *
 * @description
 * Application Layer 定義的 Koi-Koi 決策介面。
 * Use Case 實作此介面，Adapter Layer (Controllers) 依賴此介面。
 *
 * @module server/application/ports/input/makeDecisionInputPort
 */

// ============================================================
// DTOs
// ============================================================

/**
 * 決策輸入參數
 */
export interface MakeDecisionInput {
  /** 遊戲 ID */
  readonly gameId: string
  /** 玩家 ID */
  readonly playerId: string
  /** 決策 */
  readonly decision: 'KOI_KOI' | 'END_ROUND'
}

/**
 * 決策輸出結果
 */
export interface MakeDecisionOutput {
  /** 是否成功 */
  readonly success: true
}

// ============================================================
// Error
// ============================================================

/**
 * 決策錯誤代碼
 */
export type MakeDecisionErrorCode =
  | 'WRONG_PLAYER'
  | 'INVALID_STATE'
  | 'GAME_NOT_FOUND'

/**
 * 決策錯誤
 */
export class MakeDecisionError extends Error {
  constructor(
    public readonly code: MakeDecisionErrorCode,
    message: string
  ) {
    super(message)
    this.name = 'MakeDecisionError'
  }
}

// ============================================================
// Input Port
// ============================================================

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
