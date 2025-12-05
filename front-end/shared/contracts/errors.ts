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
 * 局結束原因類型
 *
 * 參考: doc/shared/protocol.md#RoundEndedInstantly
 *
 * @description
 * - TESHI: 手役（發牌後立即形成的特殊役種）
 * - FIELD_KUTTSUKI: 場牌四張同月（場札流局）
 * - NO_YAKU: 無人形成役種，牌堆耗盡
 */
export type RoundEndReason = 'TESHI' | 'FIELD_KUTTSUKI' | 'NO_YAKU'

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
