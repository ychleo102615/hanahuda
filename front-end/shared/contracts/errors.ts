/**
 * 錯誤代碼類型
 *
 * 參考: doc/shared/protocol.md#TurnError
 *
 * @description
 * 錯誤代碼涵蓋：
 * - 伺服器端錯誤（INVALID_CARD, INVALID_TARGET, WRONG_PLAYER, INVALID_STATE, INVALID_SELECTION）
 * - 客戶端預驗證錯誤（CARD_NOT_IN_HAND）
 */
export type ErrorCode =
  | 'INVALID_CARD'
  | 'INVALID_TARGET'
  | 'WRONG_PLAYER'
  | 'INVALID_STATE'
  | 'INVALID_SELECTION'
  | 'CARD_NOT_IN_HAND' // 客戶端預驗證錯誤

/**
 * 遊戲層級錯誤代碼
 *
 * 參考: contracts/sse-events.md#GameErrorEvent
 */
export type GameErrorCode =
  | 'MATCHMAKING_TIMEOUT'
  | 'GAME_EXPIRED'
  | 'SESSION_INVALID'
  | 'OPPONENT_DISCONNECTED'

/**
 * 建議的使用者操作
 */
export type SuggestedAction = 'RETRY_MATCHMAKING' | 'RETURN_HOME' | 'RECONNECT'

/**
 * 回合結束原因類型
 *
 * 參考: doc/shared/protocol.md#RoundEnded
 *
 * @description
 * - SCORED: 計分結束（有勝者、役種、分數）
 * - DRAWN: 流局（牌堆耗盡，無人形成役種）
 * - INSTANT_TESHI: 手四（手牌有 4 張同月份） - 觸發者獲 6 分
 * - INSTANT_KUTTSUKI: 喰付（手牌有 4 對同月份） - 觸發者獲 6 分
 * - INSTANT_FIELD_TESHI: 場上手四（場牌有 4 張同月份） - 流局重發
 */
export type RoundEndReason =
  | 'SCORED'
  | 'DRAWN'
  | 'INSTANT_TESHI'
  | 'INSTANT_KUTTSUKI'
  | 'INSTANT_FIELD_TESHI'

/**
 * 遊戲結束原因類型
 *
 * @description
 * - NORMAL: 正常結束（回合打完或達到結束條件）
 * - PLAYER_DISCONNECTED: 斷線玩家完成當前回合後
 * - PLAYER_IDLE_TIMEOUT: 閒置玩家在確認提示超時後
 */
export type GameEndedReason =
  | 'NORMAL'
  | 'PLAYER_DISCONNECTED'
  | 'PLAYER_IDLE_TIMEOUT'

/**
 * 錯誤訊息映射表
 *
 * @description
 * 將錯誤代碼映射為友善的使用者訊息，
 * 由 HandleTurnErrorUseCase 使用。
 */
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  INVALID_CARD: 'This card is not in your hand',
  INVALID_TARGET: 'Invalid match target',
  WRONG_PLAYER: 'Not your turn',
  INVALID_STATE: 'Cannot perform this action now',
  INVALID_SELECTION: 'Invalid match target selection',
  CARD_NOT_IN_HAND: 'This card is not in your hand',
}

/**
 * 遊戲錯誤訊息映射表
 */
export const GAME_ERROR_MESSAGES: Record<GameErrorCode, string> = {
  MATCHMAKING_TIMEOUT: 'Matchmaking timeout, please retry',
  GAME_EXPIRED: 'Game session has expired',
  SESSION_INVALID: 'Session is invalid',
  OPPONENT_DISCONNECTED: 'Opponent has disconnected',
}

/**
 * 重連重試策略常數
 *
 * @description
 * 指數退避策略：1s → 2s → 4s → 8s → 16s → 30s（最大）
 *
 * 使用於 User Story 3（錯誤處理與重連機制）
 */
export const RECONNECTION_RETRY = {
  INITIAL_DELAY_MS: 1000, // 初始延遲 1 秒
  MAX_DELAY_MS: 30000, // 最大延遲 30 秒
  BACKOFF_MULTIPLIER: 2, // 指數退避倍率
} as const
