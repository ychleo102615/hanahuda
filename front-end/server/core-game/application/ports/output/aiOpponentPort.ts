/**
 * AI Opponent Port - Output Port
 *
 * @description
 * 定義 AI 對手服務的介面。
 * 當遊戲需要 AI 對手時（如 BOT 配對），透過此 Port 請求建立 AI。
 *
 * 設計原則：
 * - 請求驅動（而非事件驅動）：只有明確需要 AI 時才調用
 * - 單一職責：專注於 AI 對手的建立
 *
 * @module server/core-game/application/ports/output/aiOpponentPort
 */

/**
 * 建立 AI 對手的輸入參數
 */
export interface CreateAiOpponentInput {
  /** 遊戲 ID */
  readonly gameId: string
}

/**
 * AI 對手服務介面
 *
 * @description
 * 由 Opponent BC 的 OpponentRegistry 實現。
 * GameCreationHandler 在 BOT 配對時調用此介面。
 */
export interface AiOpponentPort {
  /**
   * 為指定遊戲建立 AI 對手
   *
   * @description
   * 建立 AI 玩家並嘗試加入遊戲。
   * 此方法會：
   * 1. 建立 AI 玩家 ID 和 OpponentInstance
   * 2. 延遲隨機時間（模擬加入）
   * 3. 透過 JoinGameAsAiInputPort 加入遊戲
   *
   * @param input - 建立 AI 對手的參數
   */
  createAiForGame(input: CreateAiOpponentInput): Promise<void>
}
