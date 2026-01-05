/**
 * RegisterAccountUseCase
 *
 * @description
 * 帳號註冊的 Use Case。
 * 支援訪客資料遷移 (FR-009)。
 *
 * 參考: specs/010-player-account/spec.md US2 - 帳號密碼註冊
 */

import { upgradeToRegistered, type Player } from '../../domain/player/player'
import { createAccount, isValidUsername, isValidEmail, type AccountId } from '../../domain/account/account'
import { isValidPassword } from '../../domain/account/password-hash'
import { isSessionExpired, type SessionId } from '../../domain/types/session'
import type { PlayerRepositoryPort } from '../ports/output/player-repository-port'
import type { AccountRepositoryPort } from '../ports/output/account-repository-port'
import type { SessionStorePort } from '../ports/output/session-store-port'
import type { PasswordHashPort } from '../ports/output/password-hash-port'
import type { CommandResult, AuthError } from '#shared/contracts/auth-commands'
import type { RegisterRequest } from '#shared/contracts/identity-types'

// =============================================================================
// Types
// =============================================================================

/**
 * RegisterAccount 輸入參數
 */
export interface RegisterAccountInput extends RegisterRequest {
  /** 當前 Session ID */
  sessionId: string
}

/**
 * RegisterAccount 輸出結果
 */
export interface RegisterAccountResult {
  player: Player
}

// =============================================================================
// Use Case
// =============================================================================

/**
 * 帳號註冊 Use Case
 */
export class RegisterAccountUseCase {
  constructor(
    private readonly playerRepository: PlayerRepositoryPort,
    private readonly accountRepository: AccountRepositoryPort,
    private readonly sessionStore: SessionStorePort,
    private readonly passwordHasher: PasswordHashPort,
  ) {}

  /**
   * 執行註冊流程
   *
   * 1. 驗證 Session
   * 2. 驗證輸入參數
   * 3. 檢查帳號/Email 是否已存在
   * 4. 建立密碼雜湊
   * 5. 升級訪客 Player 為註冊玩家 (FR-009)
   * 6. 建立 Account
   * 7. 回傳結果
   */
  async execute(input: RegisterAccountInput): Promise<CommandResult<RegisterAccountResult, AuthError>> {
    try {
      // 1. 驗證 Session
      const session = await this.sessionStore.findById(input.sessionId as SessionId)
      if (!session) {
        return {
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Invalid session',
        }
      }

      if (isSessionExpired(session)) {
        return {
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Session expired',
        }
      }

      // 取得 Player
      const player = await this.playerRepository.findById(session.playerId)
      if (!player) {
        return {
          success: false,
          error: 'NOT_FOUND',
          message: 'Player not found',
        }
      }

      // 檢查是否已有帳號
      const existingAccount = await this.accountRepository.findByPlayerId(player.id)
      if (existingAccount) {
        return {
          success: false,
          error: 'CONFLICT',
          message: 'Player is already registered',
        }
      }

      // 2. 驗證輸入參數
      const validationError = this.validateInput(input)
      if (validationError) {
        return validationError
      }

      // 3. 檢查帳號/Email 是否已存在
      const conflictError = await this.checkConflicts(input)
      if (conflictError) {
        return conflictError
      }

      // 4. 建立密碼雜湊
      const passwordHash = await this.passwordHasher.hash(input.password)

      // 5. 升級訪客 Player 為註冊玩家 (FR-009)
      const upgradedPlayer = upgradeToRegistered(player, input.username)
      await this.playerRepository.update(upgradedPlayer)

      // 6. 建立 Account
      const now = new Date()
      const account = createAccount({
        id: crypto.randomUUID() as AccountId,
        playerId: upgradedPlayer.id,
        username: input.username,
        email: input.email ?? null,
        passwordHash,
        createdAt: now,
        updatedAt: now,
      })
      await this.accountRepository.save(account)

      // 7. 回傳結果
      return {
        success: true,
        data: {
          player: upgradedPlayer,
        },
      }
    } catch (error) {
      return {
        success: false,
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to register account',
      }
    }
  }

  /**
   * 驗證輸入參數
   */
  private validateInput(input: RegisterAccountInput): CommandResult<never, AuthError> | null {
    // 驗證密碼確認
    if (input.password !== input.confirmPassword) {
      return {
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Passwords do not match',
      }
    }

    // 驗證 Username
    if (!isValidUsername(input.username)) {
      return {
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Invalid username: must be 3-20 characters, alphanumeric and underscore only',
      }
    }

    // 驗證密碼強度
    if (!isValidPassword(input.password)) {
      return {
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Invalid password: must be at least 8 characters with letters and numbers',
      }
    }

    // 驗證 Email（若提供）
    if (input.email && !isValidEmail(input.email)) {
      return {
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Invalid email format',
      }
    }

    return null
  }

  /**
   * 檢查帳號/Email 衝突
   */
  private async checkConflicts(input: RegisterAccountInput): Promise<CommandResult<never, AuthError> | null> {
    // 檢查 Username
    const existingByUsername = await this.accountRepository.findByUsername(input.username)
    if (existingByUsername) {
      return {
        success: false,
        error: 'CONFLICT',
        message: 'Username already exists',
      }
    }

    // 檢查 Email（若提供）
    if (input.email) {
      const existingByEmail = await this.accountRepository.findByEmail(input.email)
      if (existingByEmail) {
        return {
          success: false,
          error: 'CONFLICT',
          message: 'Email already exists',
        }
      }
    }

    return null
  }
}
