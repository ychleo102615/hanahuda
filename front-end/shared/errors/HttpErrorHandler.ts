/**
 * 通用 HTTP 錯誤處理器
 *
 * @description
 * 純函數，處理技術層級的 HTTP 錯誤。
 * 不依賴任何框架或業務邏輯。
 *
 * @module shared/errors/HttpErrorHandler
 */

import { NetworkError } from './NetworkError'
import { TimeoutError } from './TimeoutError'
import { ServerError } from './ServerError'

/**
 * HTTP 錯誤處理結果
 */
export interface HttpErrorHandleResult {
  /** 是否已處理 */
  handled: boolean
  /** 建議的 UI 操作 */
  action: 'TOAST' | 'MODAL' | null
  /** 顯示訊息 */
  message: string
}

/**
 * 處理 HTTP 技術錯誤
 *
 * @description
 * 根據錯誤類型回傳處理建議：
 * - NetworkError: TOAST（可恢復）
 * - TimeoutError: TOAST（可恢復）
 * - ServerError: MODAL（不可恢復）
 *
 * @param error - 錯誤物件
 * @returns 處理結果，包含是否已處理、建議的 UI 操作、顯示訊息
 *
 * @example
 * ```typescript
 * const result = handleHttpError(error)
 * if (result.handled) {
 *   if (result.action === 'TOAST') {
 *     notification.showErrorMessage(result.message)
 *   } else if (result.action === 'MODAL') {
 *     notification.showRedirectModal(result.message, 'lobby')
 *   }
 * }
 * ```
 */
export function handleHttpError(error: unknown): HttpErrorHandleResult {
  if (error instanceof NetworkError) {
    return {
      handled: true,
      action: 'TOAST',
      message: 'Network error. Please check your connection.',
    }
  }

  if (error instanceof TimeoutError) {
    return {
      handled: true,
      action: 'TOAST',
      message: 'Request timed out. Please try again.',
    }
  }

  if (error instanceof ServerError) {
    return {
      handled: true,
      action: 'MODAL',
      message: error.message,
    }
  }

  return { handled: false, action: null, message: '' }
}

/**
 * 判斷錯誤是否為 HTTP 技術錯誤
 *
 * @param error - 錯誤物件
 * @returns 是否為 HTTP 技術錯誤
 */
export function isHttpError(
  error: unknown
): error is NetworkError | TimeoutError | ServerError {
  return (
    error instanceof NetworkError ||
    error instanceof TimeoutError ||
    error instanceof ServerError
  )
}
