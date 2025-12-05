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
  /** 玩家操作超時（秒） */
  readonly actionTimeoutSeconds: number

  /** 結果畫面顯示時間（秒） */
  readonly displayTimeoutSeconds: number

  /** 斷線超時（秒） */
  readonly disconnectTimeoutSeconds: number

  /** 假玩家動畫模擬延遲（毫秒） */
  readonly opponentAnimationDelayMs: number

  /** 假玩家思考時間下限（毫秒） */
  readonly opponentThinkingMinMs: number

  /** 假玩家思考時間上限（毫秒） */
  readonly opponentThinkingMaxMs: number

  /** SSE 心跳間隔（秒） */
  readonly sseHeartbeatIntervalSeconds: number

  /** 超時冗餘時間（秒） - 後端判定超時前的額外緩衝 */
  readonly timeoutBufferSeconds: number
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
  actionTimeoutSeconds: parseEnvNumber('ACTION_TIMEOUT_SECONDS', 15),
  displayTimeoutSeconds: parseEnvNumber('DISPLAY_TIMEOUT_SECONDS', 5),
  disconnectTimeoutSeconds: parseEnvNumber('DISCONNECT_TIMEOUT_SECONDS', 60),
  opponentAnimationDelayMs: parseEnvNumber('OPPONENT_ANIMATION_DELAY_MS', 3000),
  opponentThinkingMinMs: parseEnvNumber('OPPONENT_THINKING_MIN_MS', 1500),
  opponentThinkingMaxMs: parseEnvNumber('OPPONENT_THINKING_MAX_MS', 3000),
  sseHeartbeatIntervalSeconds: 30,
  timeoutBufferSeconds: 3,
}

/**
 * 計算假玩家隨機思考時間
 *
 * @returns 隨機思考時間（毫秒）
 */
export function getRandomOpponentThinkingTime(): number {
  const min = gameConfig.opponentThinkingMinMs
  const max = gameConfig.opponentThinkingMaxMs
  return min + Math.random() * (max - min)
}

/**
 * 計算假玩家總延遲時間（動畫 + 思考）
 *
 * @returns 總延遲時間（毫秒）
 */
export function getOpponentTotalDelay(): number {
  return gameConfig.opponentAnimationDelayMs + getRandomOpponentThinkingTime()
}

/**
 * 驗證設定是否合理
 *
 * @throws 若設定不合理則拋出錯誤
 */
export function validateConfig(): void {
  if (gameConfig.actionTimeoutSeconds <= 0) {
    throw new Error('ACTION_TIMEOUT_SECONDS must be positive')
  }
  if (gameConfig.opponentThinkingMinMs > gameConfig.opponentThinkingMaxMs) {
    throw new Error('OPPONENT_THINKING_MIN_MS must be <= OPPONENT_THINKING_MAX_MS')
  }
  if (gameConfig.disconnectTimeoutSeconds <= gameConfig.actionTimeoutSeconds) {
    throw new Error('DISCONNECT_TIMEOUT_SECONDS must be > ACTION_TIMEOUT_SECONDS')
  }
}
