/**
 * SelectTargetInputPort - Input Port
 *
 * @description
 * Application Layer 定義的選擇配對目標介面。
 * Use Case 實作此介面，Adapter Layer (Controllers) 依賴此介面。
 *
 * @module server/application/ports/input/selectTargetInputPort
 */

// ============================================================
// DTOs
// ============================================================

/**
 * 選擇配對目標輸入參數
 */
export interface SelectTargetInput {
  /** 遊戲 ID */
  readonly gameId: string
  /** 玩家 ID */
  readonly playerId: string
  /** 來源卡片（翻出的卡片） */
  readonly sourceCardId: string
  /** 選擇的配對目標 */
  readonly targetCardId: string
}

/**
 * 選擇配對目標輸出結果
 */
export interface SelectTargetOutput {
  /** 是否成功 */
  readonly success: true
}

// ============================================================
// Error
// ============================================================

/**
 * 選擇配對目標錯誤代碼
 */
export type SelectTargetErrorCode =
  | 'WRONG_PLAYER'
  | 'INVALID_STATE'
  | 'INVALID_SELECTION'
  | 'GAME_NOT_FOUND'

/**
 * 選擇配對目標錯誤
 */
export class SelectTargetError extends Error {
  constructor(
    public readonly code: SelectTargetErrorCode,
    message: string
  ) {
    super(message)
    this.name = 'SelectTargetError'
  }
}

// ============================================================
// Input Port
// ============================================================

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
