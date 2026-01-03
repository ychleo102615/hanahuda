/**
 * LinkAccountUseCase Unit Tests
 *
 * @description
 * 測試手動連結 OAuth 帳號至現有帳號的 Use Case。
 * 當 OAuth 登入發現 Email 已存在但無法自動連結時使用。
 *
 * 參考: specs/010-player-account/spec.md FR-006b
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { LinkAccountUseCase, type LinkAccountInput } from '~~/server/identity/application/use-cases/link-account-use-case'
import type { AccountRepositoryPort } from '~~/server/identity/application/ports/output/account-repository-port'
import type { OAuthLinkRepositoryPort } from '~~/server/identity/application/ports/output/oauth-link-repository-port'
import type { PlayerRepositoryPort } from '~~/server/identity/application/ports/output/player-repository-port'
import type { SessionStorePort } from '~~/server/identity/application/ports/output/session-store-port'
import { createAccount, type AccountId } from '~~/server/identity/domain/account/account'
import { createPasswordHash } from '~~/server/identity/domain/account/password-hash'
import { createRegisteredPlayer, type PlayerId } from '~~/server/identity/domain/player/player'
import { createSession, type SessionId } from '~~/server/identity/domain/types/session'

// =============================================================================
// Mocks
// =============================================================================

function createMockPlayerRepository(): PlayerRepositoryPort {
  return {
    save: vi.fn(),
    findById: vi.fn(),
    findByGuestToken: vi.fn(),
    update: vi.fn(),
  } as unknown as PlayerRepositoryPort
}

function createMockAccountRepository(): AccountRepositoryPort {
  return {
    save: vi.fn(),
    findById: vi.fn(),
    findByUsername: vi.fn(),
    findByEmail: vi.fn(),
    update: vi.fn(),
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
    delete: vi.fn(),
    touch: vi.fn(),
    findByPlayerId: vi.fn(),
    deleteByPlayerId: vi.fn(),
  } as unknown as SessionStorePort
}

// =============================================================================
// Test Fixtures
// =============================================================================

const now = new Date()
const TEST_PLAYER_ID = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee' as PlayerId
const TEST_ACCOUNT_ID = 'ffffffff-1111-4222-8333-444444444444' as AccountId

async function createTestAccount() {
  const passwordHash = await createPasswordHash('TestPass123')
  return createAccount({
    id: TEST_ACCOUNT_ID,
    playerId: TEST_PLAYER_ID,
    username: 'testuser',
    email: 'test@example.com',
    passwordHash,
    createdAt: now,
    updatedAt: now,
  })
}

function createTestPlayer() {
  return createRegisteredPlayer({
    id: TEST_PLAYER_ID,
    displayName: 'testuser',
    createdAt: now,
    updatedAt: now,
  })
}

function createTestSession(playerId: PlayerId) {
  return createSession(playerId)
}

// =============================================================================
// Tests
// =============================================================================

describe('LinkAccountUseCase', () => {
  let useCase: LinkAccountUseCase
  let mockPlayerRepository: PlayerRepositoryPort
  let mockAccountRepository: AccountRepositoryPort
  let mockOAuthLinkRepository: OAuthLinkRepositoryPort
  let mockSessionStore: SessionStorePort

  beforeEach(() => {
    mockPlayerRepository = createMockPlayerRepository()
    mockAccountRepository = createMockAccountRepository()
    mockOAuthLinkRepository = createMockOAuthLinkRepository()
    mockSessionStore = createMockSessionStore()

    useCase = new LinkAccountUseCase(
      mockPlayerRepository,
      mockAccountRepository,
      mockOAuthLinkRepository,
      mockSessionStore,
    )
  })

  describe('成功連結', () => {
    it('應該在密碼驗證成功後建立 OAuth 連結', async () => {
      // Arrange
      const account = await createTestAccount()
      const player = createTestPlayer()
      const session = createTestSession(player.id)

      vi.mocked(mockAccountRepository.findByUsername).mockResolvedValue(account)
      vi.mocked(mockPlayerRepository.findById).mockResolvedValue(player)
      vi.mocked(mockSessionStore.save).mockResolvedValue(session)
      vi.mocked(mockOAuthLinkRepository.save).mockImplementation(async (link) => link)

      const input: LinkAccountInput = {
        username: 'testuser',
        password: 'TestPass123',
        provider: 'google',
        providerUserId: 'google-user-123',
        providerEmail: 'test@example.com',
      }

      // Act
      const result = await useCase.execute(input)

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.player.id).toBe(player.id)
        expect(result.data.player.displayName).toBe('testuser')
        expect(result.data.sessionId).toBeDefined()
      }
      expect(mockOAuthLinkRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: account.id,
          provider: 'google',
          providerUserId: 'google-user-123',
        })
      )
    })

    it('應該建立新的 Session', async () => {
      // Arrange
      const account = await createTestAccount()
      const player = createTestPlayer()
      const session = createTestSession(player.id)

      vi.mocked(mockAccountRepository.findByUsername).mockResolvedValue(account)
      vi.mocked(mockPlayerRepository.findById).mockResolvedValue(player)
      vi.mocked(mockSessionStore.save).mockResolvedValue(session)
      vi.mocked(mockOAuthLinkRepository.save).mockImplementation(async (link) => link)

      const input: LinkAccountInput = {
        username: 'testuser',
        password: 'TestPass123',
        provider: 'line',
        providerUserId: 'line-user-456',
        providerEmail: null,
      }

      // Act
      const result = await useCase.execute(input)

      // Assert
      expect(result.success).toBe(true)
      expect(mockSessionStore.save).toHaveBeenCalled()
    })
  })

  describe('驗證錯誤', () => {
    it('帳號不存在時應返回錯誤', async () => {
      // Arrange
      vi.mocked(mockAccountRepository.findByUsername).mockResolvedValue(null)

      const input: LinkAccountInput = {
        username: 'nonexistent',
        password: 'TestPass123',
        provider: 'google',
        providerUserId: 'google-user-123',
        providerEmail: null,
      }

      // Act
      const result = await useCase.execute(input)

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('NOT_FOUND')
        expect(result.message).toContain('not found')
      }
    })

    it('密碼錯誤時應返回錯誤', async () => {
      // Arrange
      const account = await createTestAccount()

      vi.mocked(mockAccountRepository.findByUsername).mockResolvedValue(account)

      const input: LinkAccountInput = {
        username: 'testuser',
        password: 'WrongPassword123',
        provider: 'google',
        providerUserId: 'google-user-123',
        providerEmail: null,
      }

      // Act
      const result = await useCase.execute(input)

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('INVALID_CREDENTIALS')
        expect(result.message).toContain('Invalid')
      }
    })

    it('OAuth 已連結時應返回錯誤', async () => {
      // Arrange
      const account = await createTestAccount()
      const player = createTestPlayer()

      vi.mocked(mockAccountRepository.findByUsername).mockResolvedValue(account)
      vi.mocked(mockPlayerRepository.findById).mockResolvedValue(player)
      vi.mocked(mockOAuthLinkRepository.findByProviderUserId).mockResolvedValue({
        id: '11111111-2222-3333-4444-555555555555',
        accountId: '66666666-7777-8888-9999-aaaaaaaaaaaa',
        provider: 'google',
        providerUserId: 'google-user-123',
        providerEmail: null,
        createdAt: now,
      })

      const input: LinkAccountInput = {
        username: 'testuser',
        password: 'TestPass123',
        provider: 'google',
        providerUserId: 'google-user-123',
        providerEmail: null,
      }

      // Act
      const result = await useCase.execute(input)

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('ALREADY_EXISTS')
        expect(result.message).toContain('already linked')
      }
    })
  })

  describe('OAuth 帳號排除', () => {
    it('OAuth 建立的帳號不應允許密碼連結', async () => {
      // Arrange
      // OAuth 帳號使用特殊的 password hash 標記
      const oauthAccount = createAccount({
        id: 'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff' as AccountId,
        playerId: 'cccccccc-dddd-4eee-8fff-111111111111' as PlayerId,
        username: 'oauthuser',
        email: 'oauth@example.com',
        passwordHash: {
          hash: '$oauth$google$random-uuid',
          algorithm: 'bcrypt',
        },
        createdAt: now,
        updatedAt: now,
      })

      vi.mocked(mockAccountRepository.findByUsername).mockResolvedValue(oauthAccount)

      const input: LinkAccountInput = {
        username: 'oauthuser',
        password: 'AnyPassword123',
        provider: 'line',
        providerUserId: 'line-user-789',
        providerEmail: null,
      }

      // Act
      const result = await useCase.execute(input)

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('INVALID_CREDENTIALS')
      }
    })
  })

  describe('Player 查找錯誤', () => {
    it('Player 不存在時應返回錯誤', async () => {
      // Arrange
      const account = await createTestAccount()

      vi.mocked(mockAccountRepository.findByUsername).mockResolvedValue(account)
      vi.mocked(mockPlayerRepository.findById).mockResolvedValue(null)

      const input: LinkAccountInput = {
        username: 'testuser',
        password: 'TestPass123',
        provider: 'google',
        providerUserId: 'google-user-123',
        providerEmail: null,
      }

      // Act
      const result = await useCase.execute(input)

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('NOT_FOUND')
        expect(result.message).toContain('Player')
      }
    })
  })
})
