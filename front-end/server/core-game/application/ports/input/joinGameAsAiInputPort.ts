/**
 * JoinGameAsAiInputPort - Input Port
 *
 * @description
 * Application Layer 定義的 AI 加入遊戲介面。
 * 專門用於 AI 對手加入遊戲，與人類玩家 JoinGameInputPort 分離。
 *
 * 設計理由：
 * - AI 有額外的 metadata（strategyType）
 * - AI 不需要 sessionToken（不會斷線重連）
 * - AI 加入時不建立 WebSocket 連線
 * - 符合 Single Responsibility Principle
 *
 * @module server/application/ports/input/joinGameAsAiInputPort
 */

// ============================================================
// Types
// ============================================================

/**
 * AI 策略類型
 *
 * @description
 * 定義 AI 對手可使用的策略類型。
 * 實際策略實作由 OpponentInstance 負責。
 */
export type AiStrategyType = 'RANDOM' | 'MIN_RISK' | 'AGGRESSIVE'

/**
 * AI 加入遊戲輸入參數
 */
export interface JoinGameAsAiInput {
  /** AI 玩家 ID (UUID v4) */
  readonly playerId: string
  /** AI 玩家名稱 */
  readonly playerName: string
  /** 遊戲 ID（要加入的遊戲） */
  readonly gameId: string
  /** AI 策略類型 */
  readonly strategyType: AiStrategyType
}

/**
 * AI 加入遊戲輸出結果
 */
export interface JoinGameAsAiOutput {
  /** 遊戲 ID */
  readonly gameId: string
  /** AI 玩家 ID */
  readonly playerId: string
  /** 是否成功加入 */
  readonly success: boolean
}

// ============================================================
// Input Port
// ============================================================

/**
 * AI 加入遊戲 Input Port
 *
 * Application Layer 定義的介面，由 JoinGameAsAiUseCase 實作。
 * Adapter Layer (OpponentRegistry) 依賴此介面。
 */
export abstract class JoinGameAsAiInputPort {
  /**
   * 執行 AI 加入遊戲用例
   *
   * @param input - AI 加入遊戲參數
   * @returns AI 加入結果
   */
  abstract execute(input: JoinGameAsAiInput): Promise<JoinGameAsAiOutput>
}
