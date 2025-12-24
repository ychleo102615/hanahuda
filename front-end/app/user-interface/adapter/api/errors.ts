/**
 * API Error Types
 *
 * @description
 * 定義 REST API 客戶端可能拋出的錯誤型別。
 * 根據 contracts/api-client.md 的契約規範定義。
 */

import {
  type ApiErrorCode,
  API_ERROR_CODES,
  API_ERROR_MESSAGES,
} from '#shared/constants/httpStatusCodes'

/**
 * 網路連線失敗錯誤
 *
 * @description
 * 當 fetch 拋出 TypeError 時（通常為網路斷線），
 * 包裝為此錯誤型別。
 *
 * @example
 * ```typescript
 * throw new NetworkError()
 * throw new NetworkError('無法連線到伺服器')
 * ```
 */
export class NetworkError extends Error {
  override readonly name = 'NetworkError'

  constructor(message: string = '網路連線失敗') {
    super(message)
    Object.setPrototypeOf(this, NetworkError.prototype)
  }
}

/**
 * 伺服器錯誤 (5xx)
 *
 * @description
 * 當伺服器返回 5xx 狀態碼時,包裝為此錯誤型別。
 *
 * @property status - HTTP 狀態碼 (500-599)
 *
 * @example
 * ```typescript
 * throw new ServerError(500)
 * throw new ServerError(503, '伺服器維護中')
 * ```
 */
export class ServerError extends Error {
  override readonly name = 'ServerError'
  readonly status: number

  constructor(status: number, message?: string) {
    const defaultMessage = getErrorMessage(status)
    super(message || defaultMessage)
    this.status = status
    Object.setPrototypeOf(this, ServerError.prototype)
  }
}

/**
 * 請求超時錯誤
 *
 * @description
 * 當 AbortController 超時中止請求時,包裝為此錯誤型別。
 *
 * @example
 * ```typescript
 * throw new TimeoutError()
 * throw new TimeoutError('請求超過 5 秒限制')
 * ```
 */
export class TimeoutError extends Error {
  override readonly name = 'TimeoutError'

  constructor(message: string = '請求超時') {
    super(message)
    Object.setPrototypeOf(this, TimeoutError.prototype)
  }
}

/**
 * 客戶端驗證錯誤 (4xx)
 *
 * @description
 * 當客戶端請求不合法時（4xx 狀態碼）,包裝為此錯誤型別。
 * 也用於本地輸入驗證失敗（發送請求前）。
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
 * API 錯誤
 *
 * @description
 * 包含完整的錯誤資訊，用於統一錯誤處理。
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

/**
 * HTTP 狀態碼對應的友善錯誤訊息
 *
 * @description
 * 將 HTTP 狀態碼轉換為繁體中文的友善錯誤訊息。
 * 參考: contracts/api-client.md#3.3 錯誤訊息友善化
 */
const ERROR_MESSAGE_MAPPING: Record<number, string> = {
  400: '請求格式錯誤，請稍後再試',
  404: '遊戲不存在或已結束',
  422: '此操作不合法，請檢查遊戲狀態',
  500: '伺服器暫時無法使用，請稍後再試',
  503: '伺服器維護中，請稍後再試',
}

/**
 * 根據 HTTP 狀態碼獲取友善錯誤訊息
 *
 * @param status - HTTP 狀態碼
 * @returns 友善錯誤訊息
 *
 * @internal
 */
function getErrorMessage(status: number): string {
  return ERROR_MESSAGE_MAPPING[status] || `伺服器錯誤 (${status})`
}

/**
 * 將 HTTP 狀態碼轉換為對應的錯誤型別
 *
 * @param status - HTTP 狀態碼
 * @param responseText - 回應內容（可選）
 * @returns ServerError 或 ValidationError
 *
 * @throws {ServerError} 當狀態碼為 5xx
 * @throws {ValidationError} 當狀態碼為 4xx
 *
 * @internal
 */
export function createErrorFromStatus(status: number): ServerError | ValidationError {
  const message = getErrorMessage(status)

  if (status >= 500) {
    return new ServerError(status, message)
  } else {
    return new ValidationError(message)
  }
}
