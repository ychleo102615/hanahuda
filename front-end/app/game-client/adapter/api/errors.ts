/**
 * API Error Types (Application Level)
 *
 * @description
 * 應用層級錯誤，依賴 API_ERROR_CODES。
 * 技術層級錯誤（NetworkError, TimeoutError, ServerError）已移至 shared/errors。
 *
 * @module game-client/adapter/api/errors
 */

import {
  type ApiErrorCode,
  API_ERROR_CODES,
  API_ERROR_MESSAGES,
} from '#shared/constants/httpStatusCodes'

// 從 shared 重新匯出技術錯誤（向後相容）
export { NetworkError, TimeoutError, ServerError } from '#shared/errors'

/**
 * 客戶端驗證錯誤
 *
 * @description
 * 當客戶端請求不合法時（4xx 狀態碼）或本地輸入驗證失敗時使用。
 * 保留在 adapter 層，因為這是 API 客戶端的輸入驗證。
 *
 * @example
 * ```typescript
 * throw new ValidationError('無效的卡片 ID')
 * throw new ValidationError('遊戲尚未初始化')
 * ```
 */
export class ValidationError extends Error {
  override readonly name = 'ValidationError'

  constructor(message: string) {
    super(message)
    Object.setPrototypeOf(this, ValidationError.prototype)
  }
}

/**
 * API 錯誤（應用層級）
 *
 * @description
 * 包含 errorCode，用於根據業務邏輯決定處理策略。
 * 與後端 API 回應格式對應。
 *
 * @property status - HTTP 狀態碼
 * @property errorCode - 錯誤代碼（可能為 null）
 *
 * @example
 * ```typescript
 * throw new ApiError(409, 'GAME_NOT_STARTED', 'Game has not started yet.')
 * throw new ApiError(500, null, 'Internal server error')
 * ```
 */
export class ApiError extends Error {
  override readonly name = 'ApiError'
  readonly status: number
  readonly errorCode: ApiErrorCode | null

  constructor(status: number, errorCode: ApiErrorCode | null, message: string) {
    super(message)
    this.status = status
    this.errorCode = errorCode
    Object.setPrototypeOf(this, ApiError.prototype)
  }

  /**
   * 判斷是否為可恢復錯誤（顯示 Toast 而非重導向）
   *
   * @description
   * 可恢復錯誤：玩家可在當前頁面重試的錯誤。
   * 包括：VALIDATION_ERROR, MISSING_GAME_ID, GAME_NOT_STARTED,
   * CONFIRMATION_NOT_REQUIRED, VERSION_CONFLICT, RATE_LIMIT_EXCEEDED
   */
  get isRecoverable(): boolean {
    if (!this.errorCode) return false
    const recoverableErrors: ApiErrorCode[] = [
      API_ERROR_CODES.VALIDATION_ERROR,
      API_ERROR_CODES.MISSING_GAME_ID,
      API_ERROR_CODES.GAME_NOT_STARTED,
      API_ERROR_CODES.CONFIRMATION_NOT_REQUIRED,
      API_ERROR_CODES.VERSION_CONFLICT,
      API_ERROR_CODES.RATE_LIMIT_EXCEEDED,
    ]
    return recoverableErrors.includes(this.errorCode)
  }
}

/**
 * 從後端錯誤回應建立 ApiError
 *
 * @description
 * 解析後端錯誤回應格式 `{ error: { code, message } }`，
 * 建立對應的 ApiError 實例。
 *
 * @param status - HTTP 狀態碼
 * @param errorBody - 後端錯誤回應 body（JSON 物件或 null）
 * @returns ApiError 實例
 *
 * @example
 * ```typescript
 * const errorBody = await response.json()
 * throw createApiError(response.status, errorBody)
 * ```
 */
export function createApiError(
  status: number,
  errorBody: { error?: { code?: string; message?: string } } | null
): ApiError {
  const errorCode = (errorBody?.error?.code as ApiErrorCode) ?? null
  const backendMessage = errorBody?.error?.message ?? ''

  // 優先使用 API_ERROR_MESSAGES，否則使用後端訊息或預設訊息
  let message: string
  if (errorCode && API_ERROR_MESSAGES[errorCode]) {
    message = API_ERROR_MESSAGES[errorCode]
  } else if (backendMessage) {
    message = backendMessage
  } else {
    message = `HTTP ${status}`
  }

  return new ApiError(status, errorCode, message)
}
