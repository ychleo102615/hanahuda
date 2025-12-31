/**
 * ConfirmContinueInputPort - Input Port
 *
 * @description
 * Application Layer 定義的確認繼續遊戲介面。
 * Use Case 實作此介面，Adapter Layer (Controllers) 依賴此介面。
 *
 * 當玩家閒置超過 60 秒後，回合結束時需要確認繼續遊戲。
 * 若玩家在 7 秒內未確認，則視為放棄，踢出遊戲。
 *
 * @module server/application/ports/input/confirmContinueInputPort
 */

// ============================================================
// DTOs
// ============================================================

/**
 * 確認繼續遊戲輸入參數
 */
export interface ConfirmContinueInput {
  /** 遊戲 ID */
  readonly gameId: string
  /** 確認的玩家 ID */
  readonly playerId: string
  /** 玩家決策：繼續遊戲或離開 */
  readonly decision: 'CONTINUE' | 'LEAVE'
}

/**
 * 確認繼續遊戲輸出結果
 */
export interface ConfirmContinueOutput {
  /** 是否成功 */
  readonly success: true
  /** 確認時間 */
  readonly confirmedAt: string
}

// ============================================================
// Error
// ============================================================

/**
 * 確認繼續遊戲錯誤代碼
 */
export type ConfirmContinueErrorCode =
  | 'GAME_NOT_FOUND'
  | 'PLAYER_NOT_IN_GAME'
  | 'GAME_ALREADY_FINISHED'
  | 'CONFIRMATION_NOT_REQUIRED'

/**
 * 確認繼續遊戲錯誤
 */
export class ConfirmContinueError extends Error {
  constructor(
    public readonly code: ConfirmContinueErrorCode,
    message: string
  ) {
    super(message)
    this.name = 'ConfirmContinueError'
  }
}

// ============================================================
// Input Port
// ============================================================

/**
 * 確認繼續遊戲 Input Port
 *
 * Application Layer 定義的介面，由 ConfirmContinueUseCase 實作。
 * Adapter Layer (REST Controller) 依賴此介面。
 */
export interface ConfirmContinueInputPort {
  /**
   * 執行確認繼續遊戲用例
   *
   * @param input - 確認繼續遊戲參數
   * @returns 結果
   */
  execute(input: ConfirmContinueInput): Promise<ConfirmContinueOutput>
}
