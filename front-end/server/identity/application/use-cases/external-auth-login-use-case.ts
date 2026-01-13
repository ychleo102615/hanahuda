/**
 * ExternalAuthLoginUseCase
 *
 * @description
 * 第三方認證登入的核心 Use Case。
 * 處理所有第三方認證提供者（Google、LINE、Telegram 等）的登入邏輯。
 *
 * 此 Use Case 不知道具體的認證機制（OAuth code exchange、Telegram initData 等），
 * 只接收已驗證的用戶資訊（ExternalUserInfo），執行以下流程：
 * 1. 檢查是否已連結 → 直接登入
 * 2. 檢查 Email 是否匹配現有帳號 → 自動連結
 * 3. 建立新帳號
 *
 * 參考: specs/010-player-account/spec.md US3 - OAuth 社群登入
 */

import { createSession } from '../../domain/types/session'
import { createOAuthLink, type OAuthLinkId, type OAuthProvider } from '../../domain/oauth-link/oauth-link'
import { createRegisteredPlayer, type PlayerId } from '../../domain/player/player'
import { createAccount, type Account, type AccountId } from '../../domain/account/account'
import { createOAuthPasswordHash } from '../../domain/account/password-hash'
import { canAutoLink } from '../../domain/services/account-linking-service'
import type { PlayerRepositoryPort } from '../ports/output/player-repository-port'
import type { AccountRepositoryPort } from '../ports/output/account-repository-port'
import type { OAuthLinkRepositoryPort } from '../ports/output/oauth-link-repository-port'
import type { SessionStorePort } from '../ports/output/session-store-port'
import type { ExternalUserInfo } from '../ports/input/external-user-info'
import type { CommandResult, AuthError } from '#shared/contracts/auth-commands'
import type { PlayerInfo } from '#shared/contracts/identity-types'

// =============================================================================
// Types
// =============================================================================

/**
 * ExternalAuthLogin 輸入參數
 */
export interface ExternalAuthLoginInput {
  /** 第三方認證用戶資訊 */
  userInfo: ExternalUserInfo
}

/**
 * ExternalAuthLogin 輸出結果
 */
export type ExternalAuthLoginResult =
  | { type: 'LOGGED_IN'; player: PlayerInfo; sessionId: string }
  | { type: 'NEW_ACCOUNT'; player: PlayerInfo; sessionId: string }
  | { type: 'AUTO_LINKED'; player: PlayerInfo; sessionId: string }

// =============================================================================
// Use Case
// =============================================================================

/**
 * 第三方認證登入 Use Case
 */
export class ExternalAuthLoginUseCase {
  constructor(
    private readonly playerRepository: PlayerRepositoryPort,
    private readonly accountRepository: AccountRepositoryPort,
    private readonly oauthLinkRepository: OAuthLinkRepositoryPort,
    private readonly sessionStore: SessionStorePort,
  ) {}

  /**
   * 執行第三方認證登入流程
   *
   * @param input 包含已驗證的第三方用戶資訊
   * @returns 登入結果
   */
  async execute(input: ExternalAuthLoginInput): Promise<CommandResult<ExternalAuthLoginResult, AuthError>> {
    try {
      const { userInfo } = input

      // 驗證必要資訊
      if (!userInfo.providerUserId) {
        return {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Provider user ID is required',
        }
      }

      // 1. 檢查是否已連結
      const existingLink = await this.oauthLinkRepository.findByProviderUserId(
        userInfo.provider,
        userInfo.providerUserId
      )

      if (existingLink) {
        // 已連結 - 直接登入
        return await this.loginWithExistingLink(existingLink)
      }

      // 2. 檢查 Email 是否匹配現有帳號（自動連結 FR-006a）
      if (userInfo.email) {
        const existingAccount = await this.accountRepository.findByEmail(userInfo.email)

        if (existingAccount && canAutoLink(userInfo.email, existingAccount)) {
          return await this.autoLinkAndLogin(existingAccount, userInfo)
        }
      }

      // 3. 建立新帳號
      return await this.createNewAccountAndLogin(userInfo)

    } catch (error) {
      return {
        success: false,
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to complete external auth login',
      }
    }
  }

  /**
   * 使用現有連結登入
   */
  private async loginWithExistingLink(
    oauthLink: { id: string; accountId: string; provider: string; providerUserId: string; providerEmail: string | null; createdAt: Date }
  ): Promise<CommandResult<ExternalAuthLoginResult, AuthError>> {
    // 取得 Account
    const account = await this.accountRepository.findById(oauthLink.accountId as AccountId)
    if (!account) {
      return {
        success: false,
        error: 'NOT_FOUND',
        message: 'Account not found',
      }
    }

    // 取得 Player
    const player = await this.playerRepository.findById(account.playerId)
    if (!player) {
      return {
        success: false,
        error: 'NOT_FOUND',
        message: 'Player not found',
      }
    }

    // 建立 Session
    const session = createSession(player.id)
    const savedSession = await this.sessionStore.save(session)

    return {
      success: true,
      data: {
        type: 'LOGGED_IN',
        player: {
          id: player.id,
          displayName: player.displayName,
          isGuest: player.isGuest,
          isAuthenticated: true,
        },
        sessionId: savedSession.id as string,
      },
    }
  }

  /**
   * 自動連結並登入（FR-006a）
   */
  private async autoLinkAndLogin(
    account: Account,
    userInfo: ExternalUserInfo
  ): Promise<CommandResult<ExternalAuthLoginResult, AuthError>> {
    // 建立 OAuth Link
    const now = new Date()
    const oauthLink = createOAuthLink({
      id: crypto.randomUUID() as OAuthLinkId,
      accountId: account.id as AccountId,
      provider: userInfo.provider,
      providerUserId: userInfo.providerUserId,
      providerEmail: userInfo.email,
      createdAt: now,
    })
    await this.oauthLinkRepository.save(oauthLink)

    // 取得 Player
    const player = await this.playerRepository.findById(account.playerId as PlayerId)
    if (!player) {
      return {
        success: false,
        error: 'NOT_FOUND',
        message: 'Player not found',
      }
    }

    // 建立 Session
    const session = createSession(player.id)
    const savedSession = await this.sessionStore.save(session)

    return {
      success: true,
      data: {
        type: 'AUTO_LINKED',
        player: {
          id: player.id,
          displayName: player.displayName,
          isGuest: player.isGuest,
          isAuthenticated: true,
        },
        sessionId: savedSession.id as string,
      },
    }
  }

  /**
   * 建立新帳號並登入
   */
  private async createNewAccountAndLogin(
    userInfo: ExternalUserInfo
  ): Promise<CommandResult<ExternalAuthLoginResult, AuthError>> {
    const now = new Date()

    // 產生唯一 username
    const username = await this.generateUniqueUsername(userInfo.displayName, userInfo.provider)

    // 建立 Player
    const player = createRegisteredPlayer({
      id: crypto.randomUUID() as PlayerId,
      displayName: username,
      createdAt: now,
      updatedAt: now,
    })
    await this.playerRepository.save(player)

    // 建立 Account（第三方認證用戶不需要密碼登入）
    const account = createAccount({
      id: crypto.randomUUID() as AccountId,
      playerId: player.id,
      username,
      email: userInfo.email,
      passwordHash: createOAuthPasswordHash(),
      createdAt: now,
      updatedAt: now,
    })
    await this.accountRepository.save(account)

    // 建立 OAuth Link
    const oauthLink = createOAuthLink({
      id: crypto.randomUUID() as OAuthLinkId,
      accountId: account.id,
      provider: userInfo.provider,
      providerUserId: userInfo.providerUserId,
      providerEmail: userInfo.email,
      createdAt: now,
    })
    await this.oauthLinkRepository.save(oauthLink)

    // 建立 Session
    const session = createSession(player.id)
    const savedSession = await this.sessionStore.save(session)

    return {
      success: true,
      data: {
        type: 'NEW_ACCOUNT',
        player: {
          id: player.id,
          displayName: player.displayName,
          isGuest: player.isGuest,
          isAuthenticated: true,
        },
        sessionId: savedSession.id as string,
      },
    }
  }

  /**
   * 產生唯一 username
   */
  private async generateUniqueUsername(displayName: string | null, provider: OAuthProvider): Promise<string> {
    // 嘗試使用 displayName
    if (displayName) {
      const cleaned = displayName.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 15)
      if (cleaned.length >= 3) {
        const existing = await this.accountRepository.findByUsername(cleaned)
        if (!existing) {
          return cleaned
        }
      }
    }

    // 使用 provider + 隨機數
    const suffix = Math.random().toString(36).slice(2, 8)
    return `${provider}_${suffix}`
  }
}
