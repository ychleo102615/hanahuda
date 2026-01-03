/**
 * Auth Logging Port
 *
 * 定義認證相關事件的 logging 介面。
 *
 * @see FR-013a: 系統 MUST 記錄登入失敗事件（含時間戳、IP、帳號）
 */

export interface LoginAttemptInfo {
  username: string
  ip: string | null
  userAgent: string | null
}

export interface LoginFailureInfo extends LoginAttemptInfo {
  reason: 'INVALID_CREDENTIALS' | 'ACCOUNT_NOT_FOUND' | 'UNKNOWN'
}

export interface LoginSuccessInfo extends LoginAttemptInfo {
  playerId: string
}

export abstract class AuthLoggingPort {
  /**
   * 記錄登入失敗事件
   */
  abstract logLoginFailure(info: LoginFailureInfo): void

  /**
   * 記錄登入成功事件（選擇性，供審計使用）
   */
  abstract logLoginSuccess(info: LoginSuccessInfo): void
}
