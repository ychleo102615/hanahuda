/**
 * PlayHandCardInputPort - Input Port
 *
 * @description
 * Application Layer 定義的打手牌介面。
 * Use Case 實作此介面，Adapter Layer (Controllers) 依賴此介面。
 *
 * @module server/application/ports/input/playHandCardInputPort
 */

// ============================================================
// DTOs
// ============================================================

/**
 * 打手牌輸入參數
 */
export interface PlayHandCardInput {
  /** 遊戲 ID */
  readonly gameId: string
  /** 玩家 ID */
  readonly playerId: string
  /** 要打出的卡片 ID */
  readonly cardId: string
  /** 配對目標（雙重配對時必須指定） */
  readonly targetCardId?: string
  /** 是否為自動操作（代行），用於判斷是否重置閒置計時器 */
  readonly isAutoAction?: boolean
}

/**
 * 打手牌輸出結果
 */
export interface PlayHandCardOutput {
  /** 是否成功 */
  readonly success: true
}

// ============================================================
// Error
// ============================================================

/**
 * 打手牌錯誤代碼
 */
export type PlayHandCardErrorCode =
  | 'WRONG_PLAYER'
  | 'INVALID_STATE'
  | 'INVALID_CARD'
  | 'INVALID_TARGET'
  | 'GAME_NOT_FOUND'

/**
 * 打手牌錯誤
 */
export class PlayHandCardError extends Error {
  constructor(
    public readonly code: PlayHandCardErrorCode,
    message: string
  ) {
    super(message)
    this.name = 'PlayHandCardError'
  }
}

// ============================================================
// Input Port
// ============================================================

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
