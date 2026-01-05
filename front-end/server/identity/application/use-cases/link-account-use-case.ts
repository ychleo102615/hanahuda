/**
 * LinkAccountUseCase
 *
 * @description
 * 手動連結 OAuth 帳號至現有帳號的 Use Case。
 * 當 OAuth 登入發現 Email 已存在但無法自動連結時使用。
 *
 * 參考: specs/010-player-account/spec.md FR-006b
 */

import { createSession } from '../../domain/types/session'
import { createOAuthLink, type OAuthLinkId, type OAuthProvider } from '../../domain/oauth-link/oauth-link'
import { isOAuthPasswordHash } from '../../domain/account/password-hash'
import type { PlayerId } from '../../domain/player/player'
import type { AccountId } from '../../domain/account/account'
import type { PlayerRepositoryPort } from '../ports/output/player-repository-port'
import type { AccountRepositoryPort } from '../ports/output/account-repository-port'
import type { OAuthLinkRepositoryPort } from '../ports/output/oauth-link-repository-port'
import type { SessionStorePort } from '../ports/output/session-store-port'
import type { PasswordHashPort } from '../ports/output/password-hash-port'
import type { CommandResult, AuthError } from '#shared/contracts/auth-commands'
import type { PlayerInfo } from '#shared/contracts/identity-types'

// =============================================================================
// Types
// =============================================================================

/**
 * 連結帳號輸入參數
 */
export interface LinkAccountInput {
  /** 現有帳號的 username */
  username: string
  /** 現有帳號的密碼（用於驗證身份） */
  password: string
  /** OAuth Provider */
  provider: OAuthProvider
  /** OAuth Provider User ID */
  providerUserId: string
  /** OAuth Provider Email（可選） */
  providerEmail: string | null
}

/**
 * 連結帳號輸出結果
 */
export interface LinkAccountResult {
  player: PlayerInfo
  sessionId: string
}

// =============================================================================
// Use Case
// =============================================================================

/**
 * 手動連結帳號 Use Case
 */
export class LinkAccountUseCase {
  constructor(
    private readonly playerRepository: PlayerRepositoryPort,
    private readonly accountRepository: AccountRepositoryPort,
    private readonly oauthLinkRepository: OAuthLinkRepositoryPort,
    private readonly sessionStore: SessionStorePort,
    private readonly passwordHasher: PasswordHashPort,
  ) {}

  /**
   * 執行帳號連結流程
   *
   * 1. 驗證帳號是否存在
   * 2. 驗證密碼
   * 3. 檢查 OAuth 是否已連結到其他帳號
   * 4. 建立 OAuth Link
   * 5. 建立 Session
   * 6. 回傳結果
   */
  async execute(input: LinkAccountInput): Promise<CommandResult<LinkAccountResult, AuthError>> {
    const { username, password, provider, providerUserId, providerEmail } = input

    try {
      // 1. 查找帳號
      const account = await this.accountRepository.findByUsername(username)
      if (!account) {
        return {
          success: false,
          error: 'NOT_FOUND',
          message: 'Account not found',
        }
      }

      // 2. 驗證密碼
      // 檢查是否為 OAuth 帳號（無法使用密碼連結）
      if (isOAuthPasswordHash(account.passwordHash)) {
        return {
          success: false,
          error: 'INVALID_CREDENTIALS',
          message: 'Cannot link to OAuth-only account with password',
        }
      }

      const isValidPassword = await this.passwordHasher.verify(password, account.passwordHash)
      if (!isValidPassword) {
        return {
          success: false,
          error: 'INVALID_CREDENTIALS',
          message: 'Invalid password',
        }
      }

      // 3. 檢查 OAuth 是否已連結到其他帳號
      const existingLink = await this.oauthLinkRepository.findByProviderUserId(
        provider,
        providerUserId
      )

      if (existingLink) {
        return {
          success: false,
          error: 'ALREADY_EXISTS',
          message: 'OAuth account is already linked to another account',
        }
      }

      // 4. 查找 Player
      const player = await this.playerRepository.findById(account.playerId as PlayerId)
      if (!player) {
        return {
          success: false,
          error: 'NOT_FOUND',
          message: 'Player not found',
        }
      }

      // 5. 建立 OAuth Link
      const now = new Date()
      const oauthLink = createOAuthLink({
        id: crypto.randomUUID() as OAuthLinkId,
        accountId: account.id as AccountId,
        provider,
        providerUserId,
        providerEmail,
        createdAt: now,
      })
      await this.oauthLinkRepository.save(oauthLink)

      // 6. 建立 Session
      const session = createSession(player.id)
      const savedSession = await this.sessionStore.save(session)

      return {
        success: true,
        data: {
          player: {
            id: player.id,
            displayName: player.displayName,
            isGuest: player.isGuest,
            isAuthenticated: true,
          },
          sessionId: savedSession.id as string,
        },
      }
    } catch (error) {
      return {
        success: false,
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to link account',
      }
    }
  }
}
