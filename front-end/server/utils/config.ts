/**
 * Environment Configuration
 *
 * @description
 * 從環境變數讀取遊戲設定，提供類型安全的存取方式。
 *
 * 參考: specs/008-nuxt-backend-server/quickstart.md
 */

import {
  type RoomTypeId,
  DEFAULT_ROOM_TYPE_ID,
  isValidRoomTypeId,
} from '#shared/constants/roomTypes'

/**
 * 遊戲設定介面
 */
export interface GameConfig {
  /** 玩家操作超時（秒） - snake_case for SSE events */
  readonly action_timeout_seconds: number

  /** 結果畫面顯示時間（秒） - snake_case for SSE events */
  readonly display_timeout_seconds: number

  /** 斷線超時（秒） */
  readonly disconnect_timeout_seconds: number

  /** 斷線玩家的代行超時（秒） */
  readonly disconnected_action_timeout_seconds: number

  /** 確認繼續遊戲的額外緩衝（秒） - 在 displayTimeout 基礎上額外給予的確認時間 */
  readonly confirmation_buffer_seconds: number

  /** 出牌表演時間（毫秒）- 前端播放出牌動畫所需時間 */
  readonly card_play_animation_ms: number

  /** 假玩家思考時間下限（毫秒） */
  readonly opponent_thinking_min_ms: number

  /** 假玩家思考時間上限（毫秒） */
  readonly opponent_thinking_max_ms: number

  /** SSE 心跳間隔（秒） */
  readonly sse_heartbeat_interval_seconds: number

  /** 超時冗餘時間（秒） - 後端判定超時前的額外緩衝 */
  readonly timeout_buffer_seconds: number

  /** 會話過期時間（毫秒） */
  readonly session_timeout_ms: number

  /** 預設房間類型 */
  readonly default_room_type: RoomTypeId

  /** 使用測試牌組（用於測試 TRIPLE_MATCH 等場景） */
  readonly use_test_deck: boolean
}

/**
 * 解析環境變數為數字
 *
 * @param key 環境變數名稱
 * @param defaultValue 預設值
 * @returns 解析後的數字
 */
function parseEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key]
  if (value === undefined || value === '') {
    return defaultValue
  }
  const parsed = parseInt(value, 10)
  if (isNaN(parsed)) {
    console.warn(`Invalid value for ${key}: "${value}", using default: ${defaultValue}`)
    return defaultValue
  }
  return parsed
}

/**
 * 解析房間類型環境變數
 *
 * @returns 有效的房間類型 ID
 */
function parseRoomType(): RoomTypeId {
  const value = process.env.DEFAULT_ROOM_TYPE
  if (value === undefined || value === '') {
    return DEFAULT_ROOM_TYPE_ID
  }
  if (isValidRoomTypeId(value)) {
    return value
  }
  console.warn(`Invalid DEFAULT_ROOM_TYPE: "${value}", using default: ${DEFAULT_ROOM_TYPE_ID}`)
  return DEFAULT_ROOM_TYPE_ID
}

/**
 * 遊戲設定實例
 *
 * @description
 * 從環境變數讀取設定，若未設定則使用預設值。
 *
 * 環境變數：
 * - ACTION_TIMEOUT_SECONDS: 玩家操作超時（預設 15）
 * - DISPLAY_TIMEOUT_SECONDS: 結果畫面顯示時間（預設 5）
 * - DISCONNECT_TIMEOUT_SECONDS: 斷線超時（預設 60）
 * - CARD_PLAY_ANIMATION_MS: 出牌表演時間（預設 3000）
 * - OPPONENT_THINKING_MIN_MS: 假玩家思考下限（預設 1500）
 * - OPPONENT_THINKING_MAX_MS: 假玩家思考上限（預設 3000）
 * - DEFAULT_ROOM_TYPE: 預設房間類型（預設 QUICK）
 */
export const gameConfig: GameConfig = {
  action_timeout_seconds: parseEnvNumber('ACTION_TIMEOUT_SECONDS', 15),
  display_timeout_seconds: parseEnvNumber('DISPLAY_TIMEOUT_SECONDS', 5),
  disconnect_timeout_seconds: parseEnvNumber('DISCONNECT_TIMEOUT_SECONDS', 60),
  disconnected_action_timeout_seconds: parseEnvNumber('DISCONNECTED_ACTION_TIMEOUT_SECONDS', 3),
  confirmation_buffer_seconds: parseEnvNumber('CONFIRMATION_BUFFER_SECONDS', 2),
  card_play_animation_ms: parseEnvNumber('CARD_PLAY_ANIMATION_MS', 3000),
  opponent_thinking_min_ms: parseEnvNumber('OPPONENT_THINKING_MIN_MS', 1500),
  opponent_thinking_max_ms: parseEnvNumber('OPPONENT_THINKING_MAX_MS', 3000),
  sse_heartbeat_interval_seconds: 30,
  timeout_buffer_seconds: 3,
  session_timeout_ms: parseEnvNumber('SESSION_TIMEOUT_MS', 24 * 60 * 60 * 1000), // 24 hours
  default_room_type: parseRoomType(),
  use_test_deck: process.env.USE_TEST_DECK === 'true',
}

/**
 * 計算假玩家隨機思考時間
 *
 * @returns 隨機思考時間（毫秒）
 */
export function getRandomOpponentThinkingTime(): number {
  const min = gameConfig.opponent_thinking_min_ms
  const max = gameConfig.opponent_thinking_max_ms
  return min + Math.random() * (max - min)
}

/**
 * 計算假玩家總延遲時間（動畫 + 思考）
 *
 * @returns 總延遲時間（毫秒）
 */
export function getOpponentTotalDelay(): number {
  return gameConfig.card_play_animation_ms + getRandomOpponentThinkingTime()
}

/**
 * 驗證設定是否合理
 *
 * @throws 若設定不合理則拋出錯誤
 */
export function validateConfig(): void {
  if (gameConfig.action_timeout_seconds <= 0) {
    throw new Error('ACTION_TIMEOUT_SECONDS must be positive')
  }
  if (gameConfig.opponent_thinking_min_ms > gameConfig.opponent_thinking_max_ms) {
    throw new Error('OPPONENT_THINKING_MIN_MS must be <= OPPONENT_THINKING_MAX_MS')
  }
  if (gameConfig.disconnect_timeout_seconds <= gameConfig.action_timeout_seconds) {
    throw new Error('DISCONNECT_TIMEOUT_SECONDS must be > ACTION_TIMEOUT_SECONDS')
  }
}
