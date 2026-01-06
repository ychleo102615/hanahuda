/**
 * DeleteAccountUseCase
 *
 * @description
 * 刪除帳號的 Use Case。
 * - 訪客帳號：直接刪除，無需密碼確認
 * - 已註冊帳號：需要密碼確認
 *
 * 刪除順序（處理外鍵約束）：
 * 1. 刪除所有 Sessions
 * 2. 刪除 OAuth Links（若有）
 * 3. 刪除 Account（若有）
 * 4. 刪除 Player Stats（若有）
 * 5. 刪除 Player
 */

import type { SessionId } from '../../domain/types/session'
import type { PlayerRepositoryPort } from '../ports/output/player-repository-port'
import type { AccountRepositoryPort } from '../ports/output/account-repository-port'
import type { OAuthLinkRepositoryPort } from '../ports/output/oauth-link-repository-port'
import type { SessionStorePort } from '../ports/output/session-store-port'
import type { PasswordHashPort } from '../ports/output/password-hash-port'
import type { PlayerStatsRepositoryPort } from '~~/server/core-game/application/ports/output/playerStatsRepositoryPort'
import type { CommandResult, AuthError } from '#shared/contracts/auth-commands'
import type { DeleteAccountRequest } from '#shared/contracts/identity-types'

// =============================================================================
// Types
// =============================================================================

/**
 * Delete Account 輸入參數
 */
export interface DeleteAccountInput extends DeleteAccountRequest {
  /** Session ID（從 Cookie 取得） */
  sessionId: string
}

/**
 * Delete Account 輸出結果
 */
export interface DeleteAccountResult {
  /** 刪除成功訊息 */
  message: string
}

// =============================================================================
// Use Case
// =============================================================================

/**
 * 刪除帳號 Use Case
 */
export class DeleteAccountUseCase {
  constructor(
    private readonly playerRepository: PlayerRepositoryPort,
    private readonly accountRepository: AccountRepositoryPort,
    private readonly oauthLinkRepository: OAuthLinkRepositoryPort,
    private readonly sessionStore: SessionStorePort,
    private readonly passwordHasher: PasswordHashPort,
    private readonly playerStatsRepository: PlayerStatsRepositoryPort,
  ) {}

  /**
   * 執行刪除帳號流程
   *
   * 1. 驗證 Session
   * 2. 取得 Player
   * 3. 檢查帳號類型與密碼驗證
   * 4. 執行刪除（按順序處理外鍵約束）
   * 5. 回傳結果
   */
  async execute(input: DeleteAccountInput): Promise<CommandResult<DeleteAccountResult, AuthError>> {
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

      // 2. 取得 Player
      const player = await this.playerRepository.findById(session.playerId)
      if (!player) {
        return {
          success: false,
          error: 'NOT_FOUND',
          message: 'Player not found',
        }
      }

      // 3. 檢查帳號類型與密碼驗證
      const account = await this.accountRepository.findByPlayerId(player.id)

      if (account) {
        // 已註冊帳號：需要密碼確認
        if (!input.password) {
          return {
            success: false,
            error: 'VALIDATION_ERROR',
            message: 'Password is required to delete a registered account',
          }
        }

        // 驗證密碼
        const isPasswordValid = await this.passwordHasher.verify(input.password, account.passwordHash)
        if (!isPasswordValid) {
          return {
            success: false,
            error: 'INVALID_CREDENTIALS',
            message: 'Invalid password',
          }
        }
      }
      // 訪客帳號：無需密碼確認，直接繼續

      // 4. 執行刪除（按順序處理外鍵約束）

      // 4.1 刪除所有 Sessions（硬刪除，安全考量）
      await this.sessionStore.deleteByPlayerId(player.id)

      // 4.2 刪除 OAuth Links（硬刪除，若有帳號）
      if (account) {
        await this.oauthLinkRepository.deleteByAccountId(account.id)
      }

      // 4.3 刪除 Account（硬刪除，若有）
      if (account) {
        await this.accountRepository.delete(account.id)
      }

      // 4.4 刪除 Player Stats（硬刪除，若有）
      await this.playerStatsRepository.deleteByPlayerId(player.id)

      // 4.5 軟刪除 Player（設定 deletedAt）
      await this.playerRepository.delete(player.id)

      // 5. 回傳結果
      return {
        success: true,
        data: {
          message: 'Account deleted successfully',
        },
      }
    } catch (error) {
      return {
        success: false,
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to delete account',
      }
    }
  }
}
