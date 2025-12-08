/**
 * Logger 工具函數
 *
 * @description
 * 提供結構化日誌功能，支援 request ID 追蹤。
 * 使用 console.* 作為底層，便於在 Nitro 環境中使用。
 *
 * @example
 * ```ts
 * const logger = createLogger('JoinGameUseCase')
 * logger.info('Player joined game', { gameId, playerId })
 * logger.error('Failed to join game', error, { gameId })
 * ```
 */

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'

interface LogData {
  [key: string]: unknown
}

/**
 * 格式化日誌訊息
 *
 * @param level - 日誌等級
 * @param module - 模組名稱
 * @param message - 日誌訊息
 * @param data - 額外資料
 * @param requestId - 請求 ID（可選）
 * @returns 格式化後的日誌字串
 */
function formatLog(
  level: LogLevel,
  module: string,
  message: string,
  data?: LogData,
  requestId?: string
): string {
  const timestamp = new Date().toISOString()
  const reqIdPart = requestId ? ` [${requestId}]` : ''
  const dataPart = data ? ` ${JSON.stringify(data)}` : ''
  return `[${timestamp}] [${level}] [${module}]${reqIdPart} ${message}${dataPart}`
}

/**
 * Logger 介面
 */
export interface Logger {
  debug: (message: string, data?: LogData) => void
  info: (message: string, data?: LogData) => void
  warn: (message: string, data?: LogData) => void
  error: (message: string, error?: Error | unknown, data?: LogData) => void
  withRequestId: (requestId: string) => Logger
}

/**
 * 建立 Logger 實例
 *
 * @param module - 模組名稱，用於標識日誌來源
 * @param requestId - 請求 ID（可選）
 * @returns Logger 實例
 */
export function createLogger(module: string, requestId?: string): Logger {
  return {
    debug: (message: string, data?: LogData) => {
      // 可透過環境變數控制是否輸出 DEBUG 等級
      if (process.env.LOG_LEVEL === 'DEBUG') {
        console.debug(formatLog('DEBUG', module, message, data, requestId))
      }
    },

    info: (message: string, data?: LogData) => {
      console.log(formatLog('INFO', module, message, data, requestId))
    },

    warn: (message: string, data?: LogData) => {
      console.warn(formatLog('WARN', module, message, data, requestId))
    },

    error: (message: string, error?: Error | unknown, data?: LogData) => {
      const errorData = error instanceof Error
        ? { ...data, errorMessage: error.message, errorStack: error.stack }
        : { ...data, error }
      console.error(formatLog('ERROR', module, message, errorData, requestId))
    },

    withRequestId: (newRequestId: string) => {
      return createLogger(module, newRequestId)
    },
  }
}

/**
 * 預設的模組 Logger 工廠函數
 *
 * 為常用模組提供便捷的 logger 建立方式
 */
export const loggers = {
  api: (endpoint: string, requestId?: string) => createLogger(`API:${endpoint}`, requestId),
  useCase: (name: string, requestId?: string) => createLogger(`UseCase:${name}`, requestId),
  adapter: (name: string, requestId?: string) => createLogger(`Adapter:${name}`, requestId),
  domain: (name: string, requestId?: string) => createLogger(`Domain:${name}`, requestId),
}
