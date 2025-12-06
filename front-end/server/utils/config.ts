/**
 * Environment Configuration
 *
 * @description
 * 從環境變數讀取遊戲設定，提供類型安全的存取方式。
 *
 * 參考: specs/008-nuxt-backend-server/quickstart.md
 */

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

  /** 假玩家動畫模擬延遲（毫秒） */
  readonly opponent_animation_delay_ms: number

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
 * 遊戲設定實例
 *
 * @description
 * 從環境變數讀取設定，若未設定則使用預設值。
 *
 * 環境變數：
 * - ACTION_TIMEOUT_SECONDS: 玩家操作超時（預設 15）
 * - DISPLAY_TIMEOUT_SECONDS: 結果畫面顯示時間（預設 5）
 * - DISCONNECT_TIMEOUT_SECONDS: 斷線超時（預設 60）
 * - OPPONENT_ANIMATION_DELAY_MS: 假玩家動畫延遲（預設 3000）
 * - OPPONENT_THINKING_MIN_MS: 假玩家思考下限（預設 1500）
 * - OPPONENT_THINKING_MAX_MS: 假玩家思考上限（預設 3000）
 */
export const gameConfig: GameConfig = {
  action_timeout_seconds: parseEnvNumber('ACTION_TIMEOUT_SECONDS', 15),
  display_timeout_seconds: parseEnvNumber('DISPLAY_TIMEOUT_SECONDS', 5),
  disconnect_timeout_seconds: parseEnvNumber('DISCONNECT_TIMEOUT_SECONDS', 60),
  opponent_animation_delay_ms: parseEnvNumber('OPPONENT_ANIMATION_DELAY_MS', 3000),
  opponent_thinking_min_ms: parseEnvNumber('OPPONENT_THINKING_MIN_MS', 1500),
  opponent_thinking_max_ms: parseEnvNumber('OPPONENT_THINKING_MAX_MS', 3000),
  sse_heartbeat_interval_seconds: 30,
  timeout_buffer_seconds: 3,
  session_timeout_ms: parseEnvNumber('SESSION_TIMEOUT_MS', 24 * 60 * 60 * 1000), // 24 hours
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
  return gameConfig.opponent_animation_delay_ms + getRandomOpponentThinkingTime()
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
