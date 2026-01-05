/**
 * DeleteAccountUseCase Unit Tests
 *
 * @description
 * 測試刪除帳號 Use Case 的業務邏輯。
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DeleteAccountUseCase } from '../../../../server/identity/application/use-cases/delete-account-use-case'
import type { PlayerRepositoryPort } from '../../../../server/identity/application/ports/output/player-repository-port'
import type { AccountRepositoryPort } from '../../../../server/identity/application/ports/output/account-repository-port'
import type { OAuthLinkRepositoryPort } from '../../../../server/identity/application/ports/output/oauth-link-repository-port'
import type { SessionStorePort } from '../../../../server/identity/application/ports/output/session-store-port'
import type { PasswordHashPort } from '../../../../server/identity/application/ports/output/password-hash-port'
import type { PlayerStatsRepositoryPort } from '../../../../server/core-game/application/ports/output/playerStatsRepositoryPort'
import type { Player, PlayerId } from '../../../../server/identity/domain/player/player'
import type { Account, AccountId } from '../../../../server/identity/domain/account/account'
import type { PasswordHash } from '../../../../server/identity/domain/account/password-hash'
import type { Session, SessionId } from '../../../../server/identity/domain/types/session'

// =============================================================================
// Mocks
// =============================================================================

const mockPlayerId = 'player-123' as PlayerId
const mockAccountId = 'account-123' as AccountId
const mockSessionId = 'session-123' as SessionId

const mockGuestPlayer: Player = {
  id: mockPlayerId,
  displayName: 'Guest_A1B2',
  isGuest: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
}

const mockRegisteredPlayer: Player = {
  id: mockPlayerId,
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
  id: mockAccountId,
  playerId: mockPlayerId,
  username: 'testuser',
  email: 'test@example.com',
  passwordHash: mockPasswordHash,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
}

const mockSession: Session = {
  id: mockSessionId,
  playerId: mockPlayerId,
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  createdAt: new Date('2024-01-01'),
}

function createMockPlayerRepository(): PlayerRepositoryPort {
  return {
    save: vi.fn(),
    findById: vi.fn(),
    findByDisplayName: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteInactiveGuests: vi.fn(),
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
    delete: vi.fn(),
    deleteByPlayerId: vi.fn(),
    refresh: vi.fn(),
  } as unknown as SessionStorePort
}

function createMockPasswordHasher(): PasswordHashPort {
  return {
    hash: vi.fn(),
    verify: vi.fn(),
  } as unknown as PasswordHashPort
}

function createMockPlayerStatsRepository(): PlayerStatsRepositoryPort {
  return {
    findByPlayerId: vi.fn(),
    upsert: vi.fn(),
    deleteByPlayerId: vi.fn(),
  } as unknown as PlayerStatsRepositoryPort
}

// =============================================================================
// Test Suite
// =============================================================================

describe('DeleteAccountUseCase', () => {
  let useCase: DeleteAccountUseCase
  let playerRepository: PlayerRepositoryPort
  let accountRepository: AccountRepositoryPort
  let oauthLinkRepository: OAuthLinkRepositoryPort
  let sessionStore: SessionStorePort
  let passwordHasher: PasswordHashPort
  let playerStatsRepository: PlayerStatsRepositoryPort

  beforeEach(() => {
    playerRepository = createMockPlayerRepository()
    accountRepository = createMockAccountRepository()
    oauthLinkRepository = createMockOAuthLinkRepository()
    sessionStore = createMockSessionStore()
    passwordHasher = createMockPasswordHasher()
    playerStatsRepository = createMockPlayerStatsRepository()
    useCase = new DeleteAccountUseCase(
      playerRepository,
      accountRepository,
      oauthLinkRepository,
      sessionStore,
      passwordHasher,
      playerStatsRepository,
    )

    vi.clearAllMocks()
  })

  describe('execute - Guest Account Deletion', () => {
    it('should delete guest account without password', async () => {
      // Arrange
      vi.mocked(sessionStore.findById).mockResolvedValue(mockSession)
      vi.mocked(playerRepository.findById).mockResolvedValue(mockGuestPlayer)
      vi.mocked(accountRepository.findByPlayerId).mockResolvedValue(null)
      vi.mocked(sessionStore.deleteByPlayerId).mockResolvedValue()
      vi.mocked(playerRepository.delete).mockResolvedValue()

      // Act
      const result = await useCase.execute({
        sessionId: mockSessionId,
      })

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.message).toBe('Account deleted successfully')
      }
    })

    it('should delete all sessions for guest', async () => {
      // Arrange
      vi.mocked(sessionStore.findById).mockResolvedValue(mockSession)
      vi.mocked(playerRepository.findById).mockResolvedValue(mockGuestPlayer)
      vi.mocked(accountRepository.findByPlayerId).mockResolvedValue(null)

      // Act
      await useCase.execute({ sessionId: mockSessionId })

      // Assert
      expect(sessionStore.deleteByPlayerId).toHaveBeenCalledWith(mockPlayerId)
    })

    it('should delete player record for guest', async () => {
      // Arrange
      vi.mocked(sessionStore.findById).mockResolvedValue(mockSession)
      vi.mocked(playerRepository.findById).mockResolvedValue(mockGuestPlayer)
      vi.mocked(accountRepository.findByPlayerId).mockResolvedValue(null)

      // Act
      await useCase.execute({ sessionId: mockSessionId })

      // Assert
      expect(playerRepository.delete).toHaveBeenCalledWith(mockPlayerId)
    })

    it('should not call account/oauth delete for guest without account', async () => {
      // Arrange
      vi.mocked(sessionStore.findById).mockResolvedValue(mockSession)
      vi.mocked(playerRepository.findById).mockResolvedValue(mockGuestPlayer)
      vi.mocked(accountRepository.findByPlayerId).mockResolvedValue(null)

      // Act
      await useCase.execute({ sessionId: mockSessionId })

      // Assert
      expect(accountRepository.delete).not.toHaveBeenCalled()
      expect(oauthLinkRepository.deleteByAccountId).not.toHaveBeenCalled()
    })

    it('should delete player_stats for guest', async () => {
      // Arrange
      vi.mocked(sessionStore.findById).mockResolvedValue(mockSession)
      vi.mocked(playerRepository.findById).mockResolvedValue(mockGuestPlayer)
      vi.mocked(accountRepository.findByPlayerId).mockResolvedValue(null)

      // Act
      await useCase.execute({ sessionId: mockSessionId })

      // Assert
      expect(playerStatsRepository.deleteByPlayerId).toHaveBeenCalledWith(mockPlayerId)
    })
  })

  describe('execute - Registered Account Deletion', () => {
    it('should delete registered account with valid password', async () => {
      // Arrange
      vi.mocked(sessionStore.findById).mockResolvedValue(mockSession)
      vi.mocked(playerRepository.findById).mockResolvedValue(mockRegisteredPlayer)
      vi.mocked(accountRepository.findByPlayerId).mockResolvedValue(mockAccount)
      vi.mocked(passwordHasher.verify).mockResolvedValue(true)

      // Act
      const result = await useCase.execute({
        sessionId: mockSessionId,
        password: 'ValidPass123',
      })

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.message).toBe('Account deleted successfully')
      }
    })

    it('should require password for registered account', async () => {
      // Arrange
      vi.mocked(sessionStore.findById).mockResolvedValue(mockSession)
      vi.mocked(playerRepository.findById).mockResolvedValue(mockRegisteredPlayer)
      vi.mocked(accountRepository.findByPlayerId).mockResolvedValue(mockAccount)

      // Act
      const result = await useCase.execute({
        sessionId: mockSessionId,
        // No password provided
      })

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('VALIDATION_ERROR')
        expect(result.message).toContain('Password is required')
      }
    })

    it('should fail with invalid password', async () => {
      // Arrange
      vi.mocked(sessionStore.findById).mockResolvedValue(mockSession)
      vi.mocked(playerRepository.findById).mockResolvedValue(mockRegisteredPlayer)
      vi.mocked(accountRepository.findByPlayerId).mockResolvedValue(mockAccount)
      vi.mocked(passwordHasher.verify).mockResolvedValue(false)

      // Act
      const result = await useCase.execute({
        sessionId: mockSessionId,
        password: 'WrongPassword',
      })

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('INVALID_CREDENTIALS')
        expect(result.message).toContain('Invalid password')
      }
    })

    it('should delete in correct order (sessions, oauth, account, playerStats, player)', async () => {
      // Arrange
      vi.mocked(sessionStore.findById).mockResolvedValue(mockSession)
      vi.mocked(playerRepository.findById).mockResolvedValue(mockRegisteredPlayer)
      vi.mocked(accountRepository.findByPlayerId).mockResolvedValue(mockAccount)
      vi.mocked(passwordHasher.verify).mockResolvedValue(true)

      const callOrder: string[] = []
      vi.mocked(sessionStore.deleteByPlayerId).mockImplementation(async () => {
        callOrder.push('deleteByPlayerId')
      })
      vi.mocked(oauthLinkRepository.deleteByAccountId).mockImplementation(async () => {
        callOrder.push('deleteByAccountId')
      })
      vi.mocked(accountRepository.delete).mockImplementation(async () => {
        callOrder.push('deleteAccount')
      })
      vi.mocked(playerStatsRepository.deleteByPlayerId).mockImplementation(async () => {
        callOrder.push('deletePlayerStats')
      })
      vi.mocked(playerRepository.delete).mockImplementation(async () => {
        callOrder.push('deletePlayer')
      })

      // Act
      await useCase.execute({
        sessionId: mockSessionId,
        password: 'ValidPass123',
      })

      // Assert
      expect(callOrder).toEqual([
        'deleteByPlayerId',
        'deleteByAccountId',
        'deleteAccount',
        'deletePlayerStats',
        'deletePlayer',
      ])
    })

    it('should delete OAuth links for registered account', async () => {
      // Arrange
      vi.mocked(sessionStore.findById).mockResolvedValue(mockSession)
      vi.mocked(playerRepository.findById).mockResolvedValue(mockRegisteredPlayer)
      vi.mocked(accountRepository.findByPlayerId).mockResolvedValue(mockAccount)
      vi.mocked(passwordHasher.verify).mockResolvedValue(true)

      // Act
      await useCase.execute({
        sessionId: mockSessionId,
        password: 'ValidPass123',
      })

      // Assert
      expect(oauthLinkRepository.deleteByAccountId).toHaveBeenCalledWith(mockAccountId)
    })
  })

  describe('execute - Session Validation', () => {
    it('should fail with invalid session', async () => {
      // Arrange
      vi.mocked(sessionStore.findById).mockResolvedValue(null)

      // Act
      const result = await useCase.execute({
        sessionId: 'invalid-session',
      })

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('UNAUTHORIZED')
        expect(result.message).toContain('Invalid session')
      }
    })

    it('should fail if player not found', async () => {
      // Arrange
      vi.mocked(sessionStore.findById).mockResolvedValue(mockSession)
      vi.mocked(playerRepository.findById).mockResolvedValue(null)

      // Act
      const result = await useCase.execute({
        sessionId: mockSessionId,
      })

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('NOT_FOUND')
        expect(result.message).toContain('Player not found')
      }
    })
  })

  describe('execute - Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Arrange
      vi.mocked(sessionStore.findById).mockRejectedValue(new Error('Database error'))

      // Act
      const result = await useCase.execute({
        sessionId: mockSessionId,
      })

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('INTERNAL_ERROR')
      }
    })

    it('should handle deletion errors gracefully', async () => {
      // Arrange
      vi.mocked(sessionStore.findById).mockResolvedValue(mockSession)
      vi.mocked(playerRepository.findById).mockResolvedValue(mockGuestPlayer)
      vi.mocked(accountRepository.findByPlayerId).mockResolvedValue(null)
      vi.mocked(playerRepository.delete).mockRejectedValue(new Error('Deletion failed'))

      // Act
      const result = await useCase.execute({
        sessionId: mockSessionId,
      })

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('INTERNAL_ERROR')
      }
    })
  })
})
