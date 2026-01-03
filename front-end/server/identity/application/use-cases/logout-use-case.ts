/**
 * LogoutUseCase
 *
 * @description
 * 登出的 Use Case。
 *
 * 參考: specs/010-player-account/spec.md FR-013
 */

import type { SessionId } from '../../domain/types/session'
import type { SessionStorePort } from '../ports/output/session-store-port'
import type { CommandResult, AuthError } from '#shared/contracts/auth-commands'
import type { LogoutResponse } from '#shared/contracts/identity-types'

// =============================================================================
// Types
// =============================================================================

/**
 * Logout 輸入參數
 */
export interface LogoutInput {
  /** 當前 Session ID */
  sessionId: string
}

/**
 * Logout 輸出結果
 */
export type LogoutResult = LogoutResponse

// =============================================================================
// Use Case
// =============================================================================

/**
 * 登出 Use Case
 */
export class LogoutUseCase {
  constructor(
    private readonly sessionStore: SessionStorePort,
  ) {}

  /**
   * 執行登出流程
   *
   * 1. 驗證輸入參數
   * 2. 刪除 Session
   * 3. 回傳結果
   */
  async execute(input: LogoutInput): Promise<CommandResult<LogoutResult, AuthError>> {
    try {
      // 1. 驗證輸入參數
      if (!input.sessionId || input.sessionId.trim() === '') {
        return {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Session ID is required',
        }
      }

      // 2. 查詢 Session（可選，為了 idempotent）
      const session = await this.sessionStore.findById(input.sessionId as SessionId)

      // 3. 刪除 Session（如果存在）
      if (session) {
        await this.sessionStore.delete(input.sessionId as SessionId)
      }

      // 4. 回傳結果（即使 Session 不存在也視為成功，保持 idempotent）
      return {
        success: true,
        data: {
          success: true,
        },
      }
    } catch (error) {
      return {
        success: false,
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to logout',
      }
    }
  }
}
