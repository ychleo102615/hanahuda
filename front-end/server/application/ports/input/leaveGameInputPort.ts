/**
 * LeaveGameInputPort - Input Port
 *
 * @description
 * Application Layer 定義的離開遊戲介面。
 * Use Case 實作此介面，Adapter Layer (Controllers) 依賴此介面。
 *
 * @module server/application/ports/input/leaveGameInputPort
 */

// ============================================================
// DTOs
// ============================================================

/**
 * 離開遊戲輸入參數
 */
export interface LeaveGameInput {
  /** 遊戲 ID */
  readonly gameId: string
  /** 離開的玩家 ID */
  readonly playerId: string
}

/**
 * 離開遊戲輸出結果
 */
export interface LeaveGameOutput {
  /** 是否成功 */
  readonly success: true
  /** 離開時間 */
  readonly leftAt: string
}

// ============================================================
// Error
// ============================================================

/**
 * 離開遊戲錯誤代碼
 */
export type LeaveGameErrorCode =
  | 'GAME_NOT_FOUND'
  | 'PLAYER_NOT_IN_GAME'
  | 'GAME_ALREADY_FINISHED'

/**
 * 離開遊戲錯誤
 */
export class LeaveGameError extends Error {
  constructor(
    public readonly code: LeaveGameErrorCode,
    message: string
  ) {
    super(message)
    this.name = 'LeaveGameError'
  }
}

// ============================================================
// Input Port
// ============================================================

/**
 * 離開遊戲 Input Port
 *
 * Application Layer 定義的介面，由 LeaveGameUseCase 實作。
 * Adapter Layer (REST Controller) 依賴此介面。
 */
export interface LeaveGameInputPort {
  /**
   * 執行離開遊戲用例
   *
   * @param input - 離開遊戲參數
   * @returns 結果
   */
  execute(input: LeaveGameInput): Promise<LeaveGameOutput>
}
