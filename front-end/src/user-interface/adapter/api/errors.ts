/**
 * API Error Types
 *
 * @description
 * 定義 REST API 客戶端可能拋出的錯誤型別。
 * 根據 contracts/api-client.md 的契約規範定義。
 */

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
