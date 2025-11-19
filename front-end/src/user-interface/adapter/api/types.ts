/**
 * API Types
 *
 * @description
 * 定義 REST API 客戶端的請求和回應型別。
 * 參考: doc/shared/protocol.md
 */

/**
 * joinGame API 回應
 */
export interface JoinGameResponse {
  /** 遊戲 ID */
  game_id: string
  /** Session Token (用於 SSE 連線與重連) */
  session_token: string
  /** 玩家 ID */
  player_id: string
  /** 遊戲快照 (重連時返回,首次加入為 null) */
  snapshot: GameSnapshot | null
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
