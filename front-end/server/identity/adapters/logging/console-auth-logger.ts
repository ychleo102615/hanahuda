/**
 * Console Auth Logger
 *
 * 使用 logger 實作認證事件的 logging。
 *
 * @see FR-013a: 系統 MUST 記錄登入失敗事件（含時間戳、IP、帳號）
 */

import type {
  LoginFailureInfo,
  LoginSuccessInfo,
} from '~~/server/identity/application/ports/output/auth-logging-port'
import { AuthLoggingPort } from '~~/server/identity/application/ports/output/auth-logging-port'
import { logger } from '~~/server/utils/logger'

export class ConsoleAuthLogger extends AuthLoggingPort {
  logLoginFailure(info: LoginFailureInfo): void {
    logger.warn('Login failure', {
      event: 'LOGIN_FAILURE',
      username: info.username,
      ip: info.ip ?? 'unknown',
      userAgent: info.userAgent ?? 'unknown',
      reason: info.reason,
    })
  }

  logLoginSuccess(_info: LoginSuccessInfo): void {
    // 登入成功為常態操作，不記錄 info 層級 log
  }
}

/**
 * 建立 Console Auth Logger 實例
 */
export function createConsoleAuthLogger(): AuthLoggingPort {
  return new ConsoleAuthLogger()
}
