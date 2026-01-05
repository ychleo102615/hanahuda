/**
 * Auth Error Mapper
 *
 * @description
 * 將 AuthError 映射為 HTTP 狀態碼。
 * 提供標準化的錯誤處理函數。
 *
 * 參考: specs/010-player-account/plan.md - Cross-Cutting Concerns
 */

import type { AuthError } from '#shared/contracts/auth-commands'

/**
 * AuthError 到 HTTP 狀態碼映射
 */
const AUTH_ERROR_STATUS_MAP: Record<AuthError, number> = {
  VALIDATION_ERROR: 400,
  CONFLICT: 409,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  OAUTH_ERROR: 502,
  INTERNAL_ERROR: 500,
  INVALID_CREDENTIALS: 401,
  ALREADY_EXISTS: 409,
}

/**
 * 取得 AuthError 對應的 HTTP 狀態碼
 *
 * @param error - AuthError 類型
 * @returns HTTP 狀態碼
 */
export function getHttpStatusForAuthError(error: AuthError): number {
  return AUTH_ERROR_STATUS_MAP[error] ?? 500
}

/**
 * 建立 H3 錯誤物件
 *
 * @param error - AuthError 類型
 * @param message - 錯誤訊息
 * @returns H3 Error 物件
 */
export function createAuthError(error: AuthError, message: string) {
  return createError({
    statusCode: getHttpStatusForAuthError(error),
    statusMessage: message,
  })
}
