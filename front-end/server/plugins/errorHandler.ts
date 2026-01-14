/**
 * Global Error Handler Plugin
 *
 * @description
 * Nitro Plugin，處理未捕獲的 Promise rejection 和異常。
 * 主要用於捕捉 WebSocket 底層的 ECONNRESET/EPIPE 錯誤，
 * 避免這些正常的網路斷線錯誤導致 unhandledRejection 警告。
 *
 * @module server/plugins/errorHandler
 */

import { logger } from '~~/server/utils/logger'

/**
 * 判斷是否為網路連線重置錯誤
 *
 * @description
 * ECONNRESET: 連線被對方重置（客戶端關閉瀏覽器）
 * EPIPE: 寫入已關閉的連線
 * 這些是正常的網路斷線情況，不應視為系統錯誤。
 */
function isConnectionResetError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false
  }

  const errorCode = (error as NodeJS.ErrnoException)?.code
  return errorCode === 'ECONNRESET' || errorCode === 'EPIPE'
}

/**
 * 判斷是否為網路連線重置訊息
 *
 * @description
 * 有時錯誤可能只是字串或 message 包含 ECONNRESET
 */
function isConnectionResetMessage(error: unknown): boolean {
  if (typeof error === 'string') {
    return error.includes('ECONNRESET') || error.includes('EPIPE')
  }
  if (error instanceof Error) {
    return error.message.includes('ECONNRESET') || error.message.includes('EPIPE')
  }
  return false
}

export default defineNitroPlugin(() => {
  // 處理未捕獲的 Promise rejection
  process.on('unhandledRejection', (reason: unknown) => {
    // 網路連線重置是正常情況，降級為 debug 級別
    if (isConnectionResetError(reason) || isConnectionResetMessage(reason)) {
      logger.warn('WebSocket connection reset (unhandledRejection)', {
        code: (reason as NodeJS.ErrnoException)?.code,
      })
      return
    }

    // 其他未捕獲的 rejection 仍記錄為錯誤
    logger.error('Unhandled Promise rejection', { reason })
  })

  // 處理未捕獲的異常（作為最後防線，通常不應到達這裡）
  process.on('uncaughtException', (error: Error) => {
    // 網路連線重置是正常情況
    if (isConnectionResetError(error) || isConnectionResetMessage(error)) {
      logger.warn('WebSocket connection reset (uncaughtException)', {
        code: (error as NodeJS.ErrnoException)?.code,
      })
      return
    }

    // 其他未捕獲的異常記錄為嚴重錯誤
    logger.error('Uncaught exception', { error })
  })
})
