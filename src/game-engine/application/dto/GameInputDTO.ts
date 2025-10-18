/**
 * GameInputDTO - game-engine BC 的輸入資料傳輸物件
 *
 * 這些 DTO 定義了 game-engine BC 接受的輸入格式
 * 用於從外部 (如 UI 層或 API 層) 接收資料
 */

/**
 * 開始遊戲輸入
 */
export interface StartGameInputDTO {
  /**
   * 玩家 1 名稱
   */
  player1Name: string

  /**
   * 玩家 2 名稱
   */
  player2Name: string
}

/**
 * 出牌輸入
 */
export interface PlayCardInputDTO {
  /**
   * 玩家 ID
   */
  playerId: string

  /**
   * 出牌的卡片 ID
   */
  cardId: string

  /**
   * 選擇的場牌 ID (多重配對時需要)
   * 如果為 undefined,表示自動配對或無配對
   */
  selectedFieldCard?: string
}

/**
 * 來來決策輸入
 */
export interface KoikoiDecisionInputDTO {
  /**
   * 玩家 ID
   */
  playerId: string

  /**
   * 是否宣告來來
   * - true: 繼續遊戲 (來來)
   * - false: 結束回合 (勝負)
   */
  declareKoikoi: boolean
}

/**
 * 放棄遊戲輸入
 */
export interface AbandonGameInputDTO {
  /**
   * 遊戲 ID
   */
  gameId: string

  /**
   * 放棄遊戲的玩家 ID
   */
  abandoningPlayerId: string

  /**
   * 放棄原因
   */
  reason: 'user_quit' | 'timeout' | 'connection_lost'
}
