/**
 * API Types
 *
 * @description
 * 定義 REST API 客戶端的請求和回應型別。
 * 參考: doc/shared/protocol.md
 */

/**
 * joinGame API 請求
 */
export interface JoinGameRequest {
  /** 玩家 ID (UUID) */
  player_id: string
  /** 玩家名稱 */
  player_name: string
  /** Session Token (可選,用於重連) */
  session_token?: string
  /** 遊戲 ID (可選,用於重連) - 若提供則為重連模式,會返回遊戲狀態 */
  game_id?: string
}

/**
 * joinGame API 回應
 *
 * @note session_token 不再包含在回應中，改為透過 HttpOnly Cookie 傳送
 */
export interface JoinGameResponse {
  /** 遊戲 ID */
  game_id: string
  /** 玩家 ID */
  player_id: string
  /** SSE 端點 */
  sse_endpoint: string
}

/**
 * 遊戲快照 (用於斷線重連)
 */
export interface GameSnapshot {
  game_id: string
  flow_state: {
    flow_stage: string
    current_player_id: string
    round_number: number
    turn_number: number
  }
  field: string[]
  hands: Array<{
    player_id: string
    cards: string[]
  }>
  depositories: Array<{
    player_id: string
    cards: string[]
  }>
  scores: Array<{
    player_id: string
    score: number
  }>
  current_player_id: string
  deck_remaining: number
}

/**
 * API 客戶端選項
 */
export interface ApiClientOptions {
  /** 請求超時時間 (毫秒),預設 5000ms */
  timeout?: number
  /** 最大重試次數,預設 3 次 */
  maxRetries?: number
}
