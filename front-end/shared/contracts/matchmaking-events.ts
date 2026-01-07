/**
 * Matchmaking SSE Event Contracts
 *
 * @description
 * 配對 SSE 事件類型定義（SSOT）。
 * 對應 specs/011-online-matchmaking/contracts/matchmaking-api.yaml
 *
 * @module shared/contracts/matchmaking-events
 */

// ============================================================================
// Event Type Constants (SSOT)
// ============================================================================

/**
 * 配對 SSE 事件類型常數
 */
export const MATCHMAKING_EVENT_TYPES = {
  MatchmakingStatus: 'MatchmakingStatus',
  MatchFound: 'MatchFound',
  MatchmakingCancelled: 'MatchmakingCancelled',
  MatchmakingError: 'MatchmakingError',
} as const

/**
 * 配對 SSE 事件類型陣列（用於 EventClient 註冊監聽器）
 */
export const SSE_MATCHMAKING_EVENT_TYPES = [
  MATCHMAKING_EVENT_TYPES.MatchmakingStatus,
  MATCHMAKING_EVENT_TYPES.MatchFound,
  MATCHMAKING_EVENT_TYPES.MatchmakingCancelled,
  MATCHMAKING_EVENT_TYPES.MatchmakingError,
] as const

/**
 * 配對 SSE 事件類型（從常數陣列衍生）
 */
export type MatchmakingSSEEventType = (typeof SSE_MATCHMAKING_EVENT_TYPES)[number]

// ============================================================================
// Event Interfaces
// ============================================================================

/**
 * MatchmakingStatus 事件
 *
 * @description
 * 配對狀態更新事件。
 * - SEARCHING: 正在搜尋對手 (0-10秒)
 * - LOW_AVAILABILITY: 目前配對人數較少 (10-15秒)
 */
export interface MatchmakingStatusEvent {
  readonly event_type: typeof MATCHMAKING_EVENT_TYPES.MatchmakingStatus
  readonly entry_id: string
  readonly status: 'SEARCHING' | 'LOW_AVAILABILITY'
  readonly message: string
  readonly elapsed_seconds: number
}

/**
 * MatchFound 事件
 *
 * @description
 * 配對成功事件，包含遊戲 ID 和對手資訊。
 */
export interface MatchFoundEvent {
  readonly event_type: typeof MATCHMAKING_EVENT_TYPES.MatchFound
  readonly game_id: string
  readonly opponent_name: string
  readonly is_bot: boolean
}

/**
 * MatchmakingCancelled 事件
 *
 * @description
 * 配對已取消事件。
 */
export interface MatchmakingCancelledEvent {
  readonly event_type: typeof MATCHMAKING_EVENT_TYPES.MatchmakingCancelled
  readonly entry_id: string
  readonly message: string
}

/**
 * MatchmakingError 事件
 *
 * @description
 * 配對錯誤事件。
 */
export interface MatchmakingErrorEvent {
  readonly event_type: typeof MATCHMAKING_EVENT_TYPES.MatchmakingError
  readonly error_code: string
  readonly message: string
}

/**
 * 配對事件聯合類型
 */
export type MatchmakingEvent =
  | MatchmakingStatusEvent
  | MatchFoundEvent
  | MatchmakingCancelledEvent
  | MatchmakingErrorEvent
