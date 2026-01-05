/**
 * Console Auth Logger
 *
 * 使用 console 實作認證事件的 logging。
 * 在生產環境中可替換為結構化日誌服務（如 Consola、Winston）。
 *
 * @see FR-013a: 系統 MUST 記錄登入失敗事件（含時間戳、IP、帳號）
 */

import type {
  LoginFailureInfo,
  LoginSuccessInfo,
} from '~~/server/identity/application/ports/output/auth-logging-port'
import { AuthLoggingPort } from '~~/server/identity/application/ports/output/auth-logging-port'

export class ConsoleAuthLogger extends AuthLoggingPort {
  logLoginFailure(info: LoginFailureInfo): void {
    const timestamp = new Date().toISOString()
    const logEntry = {
      event: 'LOGIN_FAILURE',
      timestamp,
      username: info.username,
      ip: info.ip ?? 'unknown',
      userAgent: info.userAgent ?? 'unknown',
      reason: info.reason,
    }

    // 使用 warn 層級記錄登入失敗
    console.warn('[AUTH]', JSON.stringify(logEntry))
  }

  logLoginSuccess(info: LoginSuccessInfo): void {
    const timestamp = new Date().toISOString()
    const logEntry = {
      event: 'LOGIN_SUCCESS',
      timestamp,
      username: info.username,
      playerId: info.playerId,
      ip: info.ip ?? 'unknown',
      userAgent: info.userAgent ?? 'unknown',
    }

    // 使用 info 層級記錄登入成功
    console.info('[AUTH]', JSON.stringify(logEntry))
  }
}

/**
 * 建立 Console Auth Logger 實例
 */
export function createConsoleAuthLogger(): AuthLoggingPort {
  return new ConsoleAuthLogger()
}
