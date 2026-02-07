/**
 * Matchmaking Event Contracts
 *
 * @description
 * 配對事件類型定義（SSOT）。
 * 對應 specs/011-online-matchmaking/contracts/matchmaking-api.yaml
 *
 * @module shared/contracts/matchmaking-events
 */

// ============================================================================
// Event Type Constants (SSOT)
// ============================================================================

/**
 * 配對事件類型常數
 */
export const MATCHMAKING_EVENT_TYPES = {
  MatchmakingStatus: 'MatchmakingStatus',
  MatchFound: 'MatchFound',
  MatchmakingError: 'MatchmakingError',
  MatchFailed: 'MatchFailed',
  RoomDissolved: 'RoomDissolved',
  RoomExpiring: 'RoomExpiring',
} as const

/**
 * 配對事件類型陣列（用於 EventClient 註冊監聽器）
 */
export const MATCHMAKING_EVENT_TYPE_LIST = [
  MATCHMAKING_EVENT_TYPES.MatchmakingStatus,
  MATCHMAKING_EVENT_TYPES.MatchFound,
  MATCHMAKING_EVENT_TYPES.MatchmakingError,
  MATCHMAKING_EVENT_TYPES.MatchFailed,
  MATCHMAKING_EVENT_TYPES.RoomDissolved,
  MATCHMAKING_EVENT_TYPES.RoomExpiring,
] as const

/**
 * 配對事件類型（從常數陣列衍生）
 */
export type MatchmakingEventType = (typeof MATCHMAKING_EVENT_TYPE_LIST)[number]

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
 *
 * 多實例架構（方案 C）擴充欄位：
 * - game_server_url: 遊戲伺服器 WebSocket URL
 * - handoff_token: 連線切換 Token（短期有效）
 *
 * 若未提供 game_server_url，則使用當前連線（單體架構）。
 */
export interface MatchFoundEvent {
  readonly event_type: typeof MATCHMAKING_EVENT_TYPES.MatchFound
  readonly game_id: string
  readonly opponent_name: string
  readonly is_bot: boolean
  /**
   * 遊戲伺服器 WebSocket URL（多實例架構）
   *
   * @description
   * 若有此欄位，客戶端應使用此 URL 連接遊戲伺服器。
   * 格式：wss://game-server-n.example.com/_ws
   */
  readonly game_server_url?: string
  /**
   * 連線切換 Token（多實例架構）
   *
   * @description
   * 短期有效的認證 Token，用於連接遊戲伺服器。
   * 與 game_server_url 一起提供。
   */
  readonly handoff_token?: string
  /**
   * 配對類型
   *
   * @description
   * HUMAN: 人類對手配對
   * BOT: AI 對手
   * PRIVATE: 私人房間配對
   */
  readonly match_type?: 'HUMAN' | 'BOT' | 'PRIVATE'
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
 * MatchFailed 事件
 *
 * @description
 * 遊戲創建失敗事件（配對成功但遊戲創建失敗）。
 */
export interface MatchFailedEvent {
  readonly event_type: typeof MATCHMAKING_EVENT_TYPES.MatchFailed
  readonly reason: string
  readonly message: string
}

/**
 * RoomDissolved 事件
 *
 * @description
 * 私人房間被解散事件（房主解散或房間過期）。
 * 發送給房間中的訪客。
 */
export interface RoomDissolvedEvent {
  readonly event_type: typeof MATCHMAKING_EVENT_TYPES.RoomDissolved
  readonly room_id: string
  readonly reason: 'HOST_DISSOLVED' | 'EXPIRED'
}

/**
 * RoomExpiring 事件
 *
 * @description
 * 私人房間即將過期警告事件。
 * 發送給房間中所有玩家（房主和訪客）。
 */
export interface RoomExpiringEvent {
  readonly event_type: typeof MATCHMAKING_EVENT_TYPES.RoomExpiring
  readonly room_id: string
  readonly expires_in_seconds: number
}

/**
 * 配對事件聯合類型
 */
export type MatchmakingEvent =
  | MatchmakingStatusEvent
  | MatchFoundEvent
  | MatchmakingErrorEvent
  | MatchFailedEvent
  | RoomDissolvedEvent
  | RoomExpiringEvent
