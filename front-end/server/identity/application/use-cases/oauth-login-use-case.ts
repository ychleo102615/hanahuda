/**
 * OAuthLoginUseCase
 *
 * @description
 * OAuth 登入的 Use Case。
 * 支援 Google/Line 登入與帳號自動連結 (FR-006a)。
 *
 * 參考: specs/010-player-account/spec.md US3 - OAuth 社群登入
 */

import { createSession } from '../../domain/types/session'
import { createOAuthLink, type OAuthLinkId } from '../../domain/oauth-link/oauth-link'
import { createRegisteredPlayer, type Player, type PlayerId } from '../../domain/player/player'
import { createAccount, type AccountId } from '../../domain/account/account'
import { canAutoLink } from '../../domain/services/account-linking-service'
import type { PlayerRepositoryPort } from '../ports/output/player-repository-port'
import type { AccountRepositoryPort } from '../ports/output/account-repository-port'
import type { OAuthLinkRepositoryPort } from '../ports/output/oauth-link-repository-port'
import type { SessionStorePort } from '../ports/output/session-store-port'
import type { OAuthProviderPort } from '../ports/output/oauth-provider-port'
import type { CommandResult, AuthError } from '#shared/contracts/auth-commands'
import type { PlayerInfo } from '#shared/contracts/identity-types'

// =============================================================================
// Types
// =============================================================================

/**
 * OAuthLogin 輸入參數
 */
export interface OAuthLoginInput {
  /** OAuth Provider */
  provider: OAuthProviderPort
  /** 授權碼 */
  code: string
  /** 重定向 URI（某些 Provider 需要） */
  redirectUri?: string
  /** PKCE Code Verifier（Google 需要） */
  codeVerifier?: string
}

/**
 * OAuthLogin 輸出結果
 */
export type OAuthLoginResult =
  | { type: 'LOGGED_IN'; player: PlayerInfo; sessionId: string }
  | { type: 'NEW_ACCOUNT'; player: PlayerInfo; sessionId: string }
  | { type: 'LINK_PROMPT'; existingUsername: string; oauthToken: string; sessionId: string }

// =============================================================================
// Use Case
// =============================================================================

/**
 * OAuth 登入 Use Case
 */
export class OAuthLoginUseCase {
  constructor(
    private readonly playerRepository: PlayerRepositoryPort,
    private readonly accountRepository: AccountRepositoryPort,
    private readonly oauthLinkRepository: OAuthLinkRepositoryPort,
    private readonly sessionStore: SessionStorePort,
  ) {}

  /**
   * 執行 OAuth 登入流程
   *
   * 1. 交換授權碼取得 Token
   * 2. 取得使用者資訊
   * 3. 檢查是否已連結
   * 4. 自動連結或建立新帳號
   * 5. 建立 Session
   * 6. 回傳結果
   */
  async execute(input: OAuthLoginInput): Promise<CommandResult<OAuthLoginResult, AuthError>> {
    try {
      const { provider, code, redirectUri, codeVerifier } = input

      // 1. 交換授權碼取得 Token
      const tokenResult = await provider.exchangeCode({
        code,
        redirectUri,
        codeVerifier,
      })

      // 2. 取得使用者資訊
      const userInfo = await provider.getUserInfo(tokenResult.accessToken)

      // 驗證必要資訊
      if (!userInfo.providerUserId) {
        return {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Failed to get user info from OAuth provider',
        }
      }

      // 3. 檢查是否已連結
      const existingLink = await this.oauthLinkRepository.findByProviderUserId(
        provider.provider,
        userInfo.providerUserId
      )

      if (existingLink) {
        // 已連結 - 直接登入
        return await this.loginWithExistingLink(existingLink)
      }

      // 4. 檢查 Email 是否匹配現有帳號 (FR-006a)
      if (userInfo.email) {
        const existingAccount = await this.accountRepository.findByEmail(userInfo.email)

        if (existingAccount && canAutoLink(userInfo.email, existingAccount)) {
          // 自動連結
          return await this.autoLinkAndLogin(existingAccount, provider.provider, userInfo)
        }
      }

      // 5. 建立新帳號
      return await this.createNewAccountAndLogin(provider.provider, userInfo)

    } catch (error) {
      return {
        success: false,
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to complete OAuth login',
      }
    }
  }

  /**
   * 使用現有連結登入
   */
  private async loginWithExistingLink(
    oauthLink: { id: string; accountId: string; provider: string; providerUserId: string; providerEmail: string | null; createdAt: Date }
  ): Promise<CommandResult<OAuthLoginResult, AuthError>> {
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
   * 自動連結並登入 (FR-006a)
   */
  private async autoLinkAndLogin(
    account: { id: string; playerId: string; username: string; email: string | null; passwordHash: { hash: string; algorithm: 'bcrypt' }; createdAt: Date; updatedAt: Date },
    provider: 'google' | 'line',
    userInfo: { providerUserId: string; email: string | null; displayName: string | null; avatarUrl: string | null }
  ): Promise<CommandResult<OAuthLoginResult, AuthError>> {
    // 建立 OAuth Link
    const now = new Date()
    const oauthLink = createOAuthLink({
      id: crypto.randomUUID() as OAuthLinkId,
      accountId: account.id as AccountId,
      provider,
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
   * 建立新帳號並登入
   */
  private async createNewAccountAndLogin(
    provider: 'google' | 'line',
    userInfo: { providerUserId: string; email: string | null; displayName: string | null; avatarUrl: string | null }
  ): Promise<CommandResult<OAuthLoginResult, AuthError>> {
    const now = new Date()

    // 產生唯一 username
    const username = await this.generateUniqueUsername(userInfo.displayName, provider)

    // 建立 Player
    const player = createRegisteredPlayer({
      id: crypto.randomUUID() as PlayerId,
      displayName: username,
      createdAt: now,
      updatedAt: now,
    })
    await this.playerRepository.save(player)

    // 建立 Account（使用隨機密碼，OAuth 用戶不需要密碼登入）
    const account = createAccount({
      id: crypto.randomUUID() as AccountId,
      playerId: player.id,
      username,
      email: userInfo.email,
      passwordHash: {
        hash: `$oauth$${provider}$${crypto.randomUUID()}`, // 標記為 OAuth 帳號
        algorithm: 'bcrypt',
      },
      createdAt: now,
      updatedAt: now,
    })
    await this.accountRepository.save(account)

    // 建立 OAuth Link
    const oauthLink = createOAuthLink({
      id: crypto.randomUUID() as OAuthLinkId,
      accountId: account.id,
      provider,
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
  private async generateUniqueUsername(displayName: string | null, provider: string): Promise<string> {
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
