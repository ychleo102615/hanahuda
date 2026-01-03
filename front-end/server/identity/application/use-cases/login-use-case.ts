/**
 * LoginUseCase
 *
 * @description
 * 帳號登入的 Use Case。
 *
 * 參考: specs/010-player-account/spec.md US5 - 帳號登入
 */

import { createSession, type SessionId } from '../../domain/types/session'
import { verifyPassword } from '../../domain/account/password-hash'
import type { Player } from '../../domain/player/player'
import type { PlayerRepositoryPort } from '../ports/output/player-repository-port'
import type { AccountRepositoryPort } from '../ports/output/account-repository-port'
import type { SessionStorePort } from '../ports/output/session-store-port'
import type { CommandResult, AuthError } from '#shared/contracts/auth-commands'
import type { LoginRequest } from '#shared/contracts/identity-types'

// =============================================================================
// Types
// =============================================================================

/**
 * Login 輸入參數
 */
export interface LoginInput extends LoginRequest {}

/**
 * Login 輸出結果
 */
export interface LoginResult {
  player: Player
  sessionId: string
}

// =============================================================================
// Use Case
// =============================================================================

/**
 * 帳號登入 Use Case
 */
export class LoginUseCase {
  constructor(
    private readonly playerRepository: PlayerRepositoryPort,
    private readonly accountRepository: AccountRepositoryPort,
    private readonly sessionStore: SessionStorePort,
  ) {}

  /**
   * 執行登入流程
   *
   * 1. 驗證輸入參數
   * 2. 查詢帳號
   * 3. 驗證密碼
   * 4. 查詢 Player
   * 5. 清除舊 Sessions
   * 6. 建立新 Session (FR-012)
   * 7. 回傳結果
   */
  async execute(input: LoginInput): Promise<CommandResult<LoginResult, AuthError>> {
    try {
      // 1. 驗證輸入參數
      const validationError = this.validateInput(input)
      if (validationError) {
        return validationError
      }

      // 2. 查詢帳號
      const account = await this.accountRepository.findByUsername(input.username)
      if (!account) {
        // Security: 不透露是帳號不存在還是密碼錯誤
        return {
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Invalid username or password',
        }
      }

      // 3. 驗證密碼
      const isPasswordValid = await verifyPassword(input.password, account.passwordHash)
      if (!isPasswordValid) {
        // Security: 相同的錯誤訊息
        return {
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Invalid username or password',
        }
      }

      // 4. 查詢 Player
      const player = await this.playerRepository.findById(account.playerId)
      if (!player) {
        return {
          success: false,
          error: 'NOT_FOUND',
          message: 'Player not found',
        }
      }

      // 5. 清除舊 Sessions（確保單一裝置登入或登出後重登）
      await this.sessionStore.deleteByPlayerId(player.id)

      // 6. 建立新 Session (FR-012)
      const session = createSession(player.id)
      const savedSession = await this.sessionStore.save(session)

      // 7. 回傳結果
      return {
        success: true,
        data: {
          player,
          sessionId: savedSession.id as string,
        },
      }
    } catch (error) {
      return {
        success: false,
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to login',
      }
    }
  }

  /**
   * 驗證輸入參數
   */
  private validateInput(input: LoginInput): CommandResult<never, AuthError> | null {
    if (!input.username || input.username.trim() === '') {
      return {
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Username is required',
      }
    }

    if (!input.password || input.password === '') {
      return {
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Password is required',
      }
    }

    return null
  }
}
