/**
 * Server Logger Utility
 *
 * @description
 * 簡單的結構化日誌工具，使用 console.log/console.warn/console.error。
 * 格式：[LEVEL][TIMESTAMP] message { ...context }
 *
 * @module server/utils/logger
 */

/**
 * 日誌上下文
 */
export interface LogContext {
  gameId?: string
  playerId?: string
  /** Session Token（只記錄前 8 碼） */
  sessionToken?: string
  errorCode?: string
  reason?: string
  [key: string]: unknown
}

/**
 * 格式化時間戳
 */
function formatTimestamp(): string {
  return new Date().toISOString()
}

/**
 * 遮蔽敏感資訊（只顯示前 8 碼）
 */
function sanitizeToken(token?: string): string | undefined {
  if (!token) return undefined
  if (token.length <= 8) return token
  return `${token.substring(0, 8)}...`
}

/**
 * 格式化上下文為 JSON 字串
 */
function formatContext(ctx: LogContext): string {
  const sanitized: LogContext = { ...ctx }

  // 遮蔽 sessionToken
  if (sanitized.sessionToken) {
    sanitized.sessionToken = sanitizeToken(sanitized.sessionToken)
  }

  return JSON.stringify(sanitized)
}

/**
 * Logger 實例
 */
export const logger = {
  /**
   * 資訊日誌（關鍵流程追蹤）
   */
  info(message: string, ctx: LogContext = {}): void {
    console.log(`[INFO][${formatTimestamp()}] ${message}`, formatContext(ctx))
  },

  /**
   * 警告日誌（需要關注但非錯誤）
   */
  warn(message: string, ctx: LogContext = {}): void {
    console.warn(`[WARN][${formatTimestamp()}] ${message}`, formatContext(ctx))
  },

  /**
   * 錯誤日誌（必須調查）
   */
  error(message: string, ctx: LogContext = {}): void {
    console.error(`[ERROR][${formatTimestamp()}] ${message}`, formatContext(ctx))
  },
}
