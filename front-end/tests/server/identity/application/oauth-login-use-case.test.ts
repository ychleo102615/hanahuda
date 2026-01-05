/**
 * OAuthLoginUseCase Unit Tests
 *
 * @description
 * 測試 OAuth 登入 Use Case 的業務邏輯。
 *
 * 參考: specs/010-player-account/spec.md FR-004, FR-005, FR-006a
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { OAuthLoginUseCase } from '../../../../server/identity/application/use-cases/oauth-login-use-case'
import type { PlayerRepositoryPort } from '../../../../server/identity/application/ports/output/player-repository-port'
import type { AccountRepositoryPort } from '../../../../server/identity/application/ports/output/account-repository-port'
import type { OAuthLinkRepositoryPort } from '../../../../server/identity/application/ports/output/oauth-link-repository-port'
import type { SessionStorePort } from '../../../../server/identity/application/ports/output/session-store-port'
import type { OAuthProviderPort, OAuthUserInfo } from '../../../../server/identity/application/ports/output/oauth-provider-port'
import type { Player, PlayerId } from '../../../../server/identity/domain/player/player'
import type { Account, AccountId } from '../../../../server/identity/domain/account/account'
import type { OAuthLink, OAuthLinkId } from '../../../../server/identity/domain/oauth-link/oauth-link'
import type { PasswordHash } from '../../../../server/identity/domain/account/password-hash'
import type { SessionId } from '../../../../server/identity/domain/types/session'

// =============================================================================
// Mocks
// =============================================================================

const mockPlayer: Player = {
  id: 'player-123' as PlayerId,
  displayName: 'testuser',
  isGuest: false,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
}

const mockPasswordHash: PasswordHash = {
  hash: '$2a$10$hashedpassword',
  algorithm: 'bcrypt',
}

const mockAccount: Account = {
  id: 'account-123' as AccountId,
  playerId: 'player-123' as PlayerId,
  username: 'testuser',
  email: 'test@gmail.com',
  passwordHash: mockPasswordHash,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
}

const mockOAuthLink: OAuthLink = {
  id: 'link-123' as OAuthLinkId,
  accountId: 'account-123' as AccountId,
  provider: 'google',
  providerUserId: 'google-user-123',
  providerEmail: 'test@gmail.com',
  createdAt: new Date('2024-01-01'),
}

const mockOAuthUserInfo: OAuthUserInfo = {
  providerUserId: 'google-user-123',
  email: 'test@gmail.com',
  displayName: 'Test User',
  avatarUrl: null,
}

function createMockPlayerRepository(): PlayerRepositoryPort {
  return {
    save: vi.fn(),
    findById: vi.fn(),
    findByDisplayName: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  } as unknown as PlayerRepositoryPort
}

function createMockAccountRepository(): AccountRepositoryPort {
  return {
    save: vi.fn(),
    findById: vi.fn(),
    findByUsername: vi.fn(),
    findByEmail: vi.fn(),
    findByPlayerId: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  } as unknown as AccountRepositoryPort
}

function createMockOAuthLinkRepository(): OAuthLinkRepositoryPort {
  return {
    save: vi.fn(),
    findById: vi.fn(),
    findByProviderUserId: vi.fn(),
    findByAccountId: vi.fn(),
    delete: vi.fn(),
    deleteByAccountId: vi.fn(),
  } as unknown as OAuthLinkRepositoryPort
}

function createMockSessionStore(): SessionStorePort {
  return {
    save: vi.fn(),
    findById: vi.fn(),
    findByPlayerId: vi.fn(),
    delete: vi.fn(),
    deleteByPlayerId: vi.fn(),
    refresh: vi.fn(),
  } as unknown as SessionStorePort
}

function createMockOAuthProvider(): OAuthProviderPort {
  return {
    provider: 'google',
    createAuthorizationUrl: vi.fn(),
    exchangeCode: vi.fn(),
    getUserInfo: vi.fn(),
    validateState: vi.fn(),
  } as unknown as OAuthProviderPort
}

// =============================================================================
// Test Suite
// =============================================================================

describe('OAuthLoginUseCase', () => {
  let useCase: OAuthLoginUseCase
  let playerRepository: PlayerRepositoryPort
  let accountRepository: AccountRepositoryPort
  let oauthLinkRepository: OAuthLinkRepositoryPort
  let sessionStore: SessionStorePort
  let oauthProvider: OAuthProviderPort

  beforeEach(() => {
    playerRepository = createMockPlayerRepository()
    accountRepository = createMockAccountRepository()
    oauthLinkRepository = createMockOAuthLinkRepository()
    sessionStore = createMockSessionStore()
    oauthProvider = createMockOAuthProvider()

    useCase = new OAuthLoginUseCase(
      playerRepository,
      accountRepository,
      oauthLinkRepository,
      sessionStore
    )

    vi.clearAllMocks()
  })

  describe('execute - Existing OAuth Link', () => {
    it('should login when OAuth link already exists', async () => {
      // Arrange
      vi.mocked(oauthProvider.exchangeCode).mockResolvedValue({
        accessToken: 'access-token',
      })
      vi.mocked(oauthProvider.getUserInfo).mockResolvedValue(mockOAuthUserInfo)
      vi.mocked(oauthLinkRepository.findByProviderUserId).mockResolvedValue(mockOAuthLink)
      vi.mocked(accountRepository.findById).mockResolvedValue(mockAccount)
      vi.mocked(playerRepository.findById).mockResolvedValue(mockPlayer)
      vi.mocked(sessionStore.save).mockResolvedValue({
        id: 'session-123' as SessionId,
        playerId: mockPlayer.id,
        expiresAt: new Date(),
        createdAt: new Date(),
      })

      // Act
      const result = await useCase.execute({
        provider: oauthProvider,
        code: 'auth-code',
        redirectUri: 'http://localhost/callback',
      })

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.type).toBe('LOGGED_IN')
        expect(result.data.player.id).toBe(mockPlayer.id)
      }
    })
  })

  describe('execute - Auto Link (FR-006a)', () => {
    it('should auto-link when OAuth email matches existing account email', async () => {
      // Arrange
      vi.mocked(oauthProvider.exchangeCode).mockResolvedValue({
        accessToken: 'access-token',
      })
      vi.mocked(oauthProvider.getUserInfo).mockResolvedValue(mockOAuthUserInfo)
      vi.mocked(oauthLinkRepository.findByProviderUserId).mockResolvedValue(null)
      vi.mocked(accountRepository.findByEmail).mockResolvedValue(mockAccount)
      vi.mocked(playerRepository.findById).mockResolvedValue(mockPlayer)
      vi.mocked(oauthLinkRepository.save).mockResolvedValue(mockOAuthLink)
      vi.mocked(sessionStore.save).mockResolvedValue({
        id: 'session-123' as SessionId,
        playerId: mockPlayer.id,
        expiresAt: new Date(),
        createdAt: new Date(),
      })

      // Act
      const result = await useCase.execute({
        provider: oauthProvider,
        code: 'auth-code',
        redirectUri: 'http://localhost/callback',
      })

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.type).toBe('LOGGED_IN')
        expect(oauthLinkRepository.save).toHaveBeenCalled()
      }
    })
  })

  describe('execute - Create New Account', () => {
    it('should create new account when no existing link or email match', async () => {
      // Arrange
      vi.mocked(oauthProvider.exchangeCode).mockResolvedValue({
        accessToken: 'access-token',
      })
      vi.mocked(oauthProvider.getUserInfo).mockResolvedValue({
        ...mockOAuthUserInfo,
        email: 'new@gmail.com',
      })
      vi.mocked(oauthLinkRepository.findByProviderUserId).mockResolvedValue(null)
      vi.mocked(accountRepository.findByEmail).mockResolvedValue(null)
      vi.mocked(playerRepository.save).mockResolvedValue({
        ...mockPlayer,
        id: 'new-player' as PlayerId,
      })
      vi.mocked(accountRepository.save).mockResolvedValue({
        ...mockAccount,
        id: 'new-account' as AccountId,
      })
      vi.mocked(oauthLinkRepository.save).mockResolvedValue(mockOAuthLink)
      vi.mocked(sessionStore.save).mockResolvedValue({
        id: 'session-123' as SessionId,
        playerId: 'new-player' as PlayerId,
        expiresAt: new Date(),
        createdAt: new Date(),
      })

      // Act
      const result = await useCase.execute({
        provider: oauthProvider,
        code: 'auth-code',
        redirectUri: 'http://localhost/callback',
      })

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.type).toBe('NEW_ACCOUNT')
        expect(playerRepository.save).toHaveBeenCalled()
        expect(accountRepository.save).toHaveBeenCalled()
      }
    })
  })

  describe('execute - Error Handling', () => {
    it('should handle OAuth exchange failure', async () => {
      // Arrange
      vi.mocked(oauthProvider.exchangeCode).mockRejectedValue(new Error('OAuth error'))

      // Act
      const result = await useCase.execute({
        provider: oauthProvider,
        code: 'invalid-code',
        redirectUri: 'http://localhost/callback',
      })

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('INTERNAL_ERROR')
      }
    })

    it('should handle missing user info', async () => {
      // Arrange
      vi.mocked(oauthProvider.exchangeCode).mockResolvedValue({
        accessToken: 'access-token',
      })
      vi.mocked(oauthProvider.getUserInfo).mockResolvedValue({
        providerUserId: '',
        email: null,
        displayName: null,
        avatarUrl: null,
      })

      // Act
      const result = await useCase.execute({
        provider: oauthProvider,
        code: 'auth-code',
        redirectUri: 'http://localhost/callback',
      })

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('VALIDATION_ERROR')
      }
    })
  })
})
