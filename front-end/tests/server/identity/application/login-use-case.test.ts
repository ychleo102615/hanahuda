/**
 * LoginUseCase Unit Tests
 *
 * @description
 * 測試登入 Use Case 的業務邏輯。
 *
 * 參考: specs/010-player-account/spec.md FR-011, FR-012
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { LoginUseCase } from '../../../../server/identity/application/use-cases/login-use-case'
import type { PlayerRepositoryPort } from '../../../../server/identity/application/ports/output/player-repository-port'
import type { AccountRepositoryPort } from '../../../../server/identity/application/ports/output/account-repository-port'
import type { SessionStorePort } from '../../../../server/identity/application/ports/output/session-store-port'
import type { Player, PlayerId } from '../../../../server/identity/domain/player/player'
import type { Account, AccountId } from '../../../../server/identity/domain/account/account'
import type { PasswordHash } from '../../../../server/identity/domain/account/password-hash'
import * as passwordHashModule from '../../../../server/identity/domain/account/password-hash'

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
  email: 'test@example.com',
  passwordHash: mockPasswordHash,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
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

function createMockSessionStore(): SessionStorePort {
  return {
    save: vi.fn(),
    findById: vi.fn(),
    findByPlayerId: vi.fn(),
    delete: vi.fn(),
    deleteByPlayerId: vi.fn(),
  } as unknown as SessionStorePort
}

// =============================================================================
// Test Suite
// =============================================================================

describe('LoginUseCase', () => {
  let useCase: LoginUseCase
  let playerRepository: PlayerRepositoryPort
  let accountRepository: AccountRepositoryPort
  let sessionStore: SessionStorePort

  beforeEach(() => {
    playerRepository = createMockPlayerRepository()
    accountRepository = createMockAccountRepository()
    sessionStore = createMockSessionStore()
    useCase = new LoginUseCase(playerRepository, accountRepository, sessionStore)

    // Reset all mocks
    vi.clearAllMocks()
  })

  describe('execute - Successful Login', () => {
    it('should authenticate user with valid credentials', async () => {
      // Arrange
      vi.mocked(accountRepository.findByUsername).mockResolvedValue(mockAccount)
      vi.mocked(playerRepository.findById).mockResolvedValue(mockPlayer)
      vi.spyOn(passwordHashModule, 'verifyPassword').mockResolvedValue(true)
      vi.mocked(sessionStore.save).mockResolvedValue({
        id: 'session-123' as any,
        playerId: mockPlayer.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      })

      // Act
      const result = await useCase.execute({
        username: 'testuser',
        password: 'ValidPass123',
      })

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.player.id).toBe(mockPlayer.id)
        expect(result.data.player.displayName).toBe('testuser')
        expect(result.data.player.isGuest).toBe(false)
        expect(result.data.sessionId).toBeDefined()
      }
    })

    it('should create new session on successful login (FR-012)', async () => {
      // Arrange
      vi.mocked(accountRepository.findByUsername).mockResolvedValue(mockAccount)
      vi.mocked(playerRepository.findById).mockResolvedValue(mockPlayer)
      vi.spyOn(passwordHashModule, 'verifyPassword').mockResolvedValue(true)
      vi.mocked(sessionStore.save).mockResolvedValue({
        id: 'new-session-id' as any,
        playerId: mockPlayer.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      })

      // Act
      const result = await useCase.execute({
        username: 'testuser',
        password: 'ValidPass123',
      })

      // Assert
      expect(sessionStore.save).toHaveBeenCalled()
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.sessionId).toBe('new-session-id')
      }
    })

    it('should delete existing sessions before creating new one', async () => {
      // Arrange
      vi.mocked(accountRepository.findByUsername).mockResolvedValue(mockAccount)
      vi.mocked(playerRepository.findById).mockResolvedValue(mockPlayer)
      vi.spyOn(passwordHashModule, 'verifyPassword').mockResolvedValue(true)
      vi.mocked(sessionStore.deleteByPlayerId).mockResolvedValue()
      vi.mocked(sessionStore.save).mockResolvedValue({
        id: 'session-123' as any,
        playerId: mockPlayer.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      })

      // Act
      await useCase.execute({
        username: 'testuser',
        password: 'ValidPass123',
      })

      // Assert
      expect(sessionStore.deleteByPlayerId).toHaveBeenCalledWith(mockPlayer.id)
    })
  })

  describe('execute - Invalid Credentials', () => {
    it('should fail when username does not exist', async () => {
      // Arrange
      vi.mocked(accountRepository.findByUsername).mockResolvedValue(null)

      // Act
      const result = await useCase.execute({
        username: 'nonexistent',
        password: 'SomePass123',
      })

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('UNAUTHORIZED')
        expect(result.message).toContain('Invalid username or password')
      }
    })

    it('should fail when password is incorrect', async () => {
      // Arrange
      vi.mocked(accountRepository.findByUsername).mockResolvedValue(mockAccount)
      vi.spyOn(passwordHashModule, 'verifyPassword').mockResolvedValue(false)

      // Act
      const result = await useCase.execute({
        username: 'testuser',
        password: 'WrongPassword123',
      })

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('UNAUTHORIZED')
        expect(result.message).toContain('Invalid username or password')
      }
    })

    it('should not reveal whether username or password was wrong', async () => {
      // Arrange - Test non-existent user
      vi.mocked(accountRepository.findByUsername).mockResolvedValue(null)

      const result1 = await useCase.execute({
        username: 'nonexistent',
        password: 'SomePass123',
      })

      // Arrange - Test wrong password
      vi.mocked(accountRepository.findByUsername).mockResolvedValue(mockAccount)
      vi.spyOn(passwordHashModule, 'verifyPassword').mockResolvedValue(false)

      const result2 = await useCase.execute({
        username: 'testuser',
        password: 'WrongPassword123',
      })

      // Assert - Both should have same error message (security best practice)
      expect(result1.success).toBe(false)
      expect(result2.success).toBe(false)
      if (!result1.success && !result2.success) {
        expect(result1.message).toBe(result2.message)
      }
    })
  })

  describe('execute - Validation Errors', () => {
    it('should fail when username is empty', async () => {
      // Act
      const result = await useCase.execute({
        username: '',
        password: 'ValidPass123',
      })

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('VALIDATION_ERROR')
      }
    })

    it('should fail when password is empty', async () => {
      // Act
      const result = await useCase.execute({
        username: 'testuser',
        password: '',
      })

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('VALIDATION_ERROR')
      }
    })
  })

  describe('execute - Player Not Found', () => {
    it('should fail when account exists but player not found', async () => {
      // Arrange
      vi.mocked(accountRepository.findByUsername).mockResolvedValue(mockAccount)
      vi.mocked(playerRepository.findById).mockResolvedValue(null)
      vi.spyOn(passwordHashModule, 'verifyPassword').mockResolvedValue(true)

      // Act
      const result = await useCase.execute({
        username: 'testuser',
        password: 'ValidPass123',
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
      vi.mocked(accountRepository.findByUsername).mockRejectedValue(new Error('Database error'))

      // Act
      const result = await useCase.execute({
        username: 'testuser',
        password: 'ValidPass123',
      })

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('INTERNAL_ERROR')
      }
    })
  })
})
