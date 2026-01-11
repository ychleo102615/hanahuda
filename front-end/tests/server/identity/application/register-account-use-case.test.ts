/**
 * RegisterAccountUseCase Tests
 *
 * @description
 * 測試帳號註冊的 Use Case。
 * 包含訪客資料遷移 (FR-009) 測試。
 *
 * 參考: specs/010-player-account/spec.md US2 - 帳號密碼註冊
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { RegisterAccountUseCase } from '~~/server/identity/application/use-cases/register-account-use-case'
import type { PlayerRepositoryPort } from '~~/server/identity/application/ports/output/player-repository-port'
import type { AccountRepositoryPort } from '~~/server/identity/application/ports/output/account-repository-port'
import type { SessionStorePort } from '~~/server/identity/application/ports/output/session-store-port'
import type { PasswordHashPort } from '~~/server/identity/application/ports/output/password-hash-port'
import type { Player, PlayerId } from '~~/server/identity/domain/player/player'
import type { Account, AccountId } from '~~/server/identity/domain/account/account'
import type { Session, SessionId } from '~~/server/identity/domain/types/session'
import type { PasswordHash } from '~~/server/identity/domain/account/password-hash'

describe('RegisterAccountUseCase', () => {
  let useCase: RegisterAccountUseCase
  let mockPlayerRepository: PlayerRepositoryPort
  let mockAccountRepository: AccountRepositoryPort
  let mockSessionStore: SessionStorePort
  let mockPasswordHasher: PasswordHashPort

  const mockPasswordHash: PasswordHash = {
    hash: '$2a$10$mockedhashvalue',
    algorithm: 'bcrypt',
  }

  const mockGuestPlayer: Player = {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' as PlayerId,
    displayName: 'Guest_ABCD',
    isGuest: true,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  }

  const mockSession: Session = {
    id: 'session-id-12345' as SessionId,
    playerId: mockGuestPlayer.id,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    expiresAt: new Date('2126-01-08T00:00:00Z'),
    lastAccessedAt: new Date('2026-01-01T00:00:00Z'),
  }

  beforeEach(() => {
    mockPlayerRepository = {
      save: vi.fn().mockImplementation((player: Player) => Promise.resolve(player)),
      findById: vi.fn().mockResolvedValue(mockGuestPlayer),
      findByDisplayName: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockImplementation((player: Player) => Promise.resolve(player)),
      delete: vi.fn(),
    }

    mockAccountRepository = {
      save: vi.fn().mockImplementation((account: Account) => Promise.resolve(account)),
      findById: vi.fn().mockResolvedValue(null),
      findByUsername: vi.fn().mockResolvedValue(null),
      findByEmail: vi.fn().mockResolvedValue(null),
      findByPlayerId: vi.fn().mockResolvedValue(null),
      update: vi.fn(),
      delete: vi.fn(),
    }

    mockSessionStore = {
      save: vi.fn().mockImplementation((session: Session) => Promise.resolve(session)),
      findById: vi.fn().mockResolvedValue(mockSession),
      delete: vi.fn(),
      deleteByPlayerId: vi.fn(),
      refresh: vi.fn(),
    }

    mockPasswordHasher = {
      hash: vi.fn().mockResolvedValue(mockPasswordHash),
      verify: vi.fn().mockResolvedValue(true),
    }

    useCase = new RegisterAccountUseCase(
      mockPlayerRepository,
      mockAccountRepository,
      mockSessionStore,
      mockPasswordHasher,
    )
  })

  describe('execute - Basic Registration', () => {
    it('should register a new account successfully', async () => {
      const result = await useCase.execute({
        sessionId: 'session-id-12345',
        username: 'newuser',
        password: 'password123',
        confirmPassword: 'password123',
        email: 'test@example.com',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.player.displayName).toBe('newuser')
        expect(result.data.player.isGuest).toBe(false)
      }
    })

    it('should create account with correct username', async () => {
      await useCase.execute({
        sessionId: 'session-id-12345',
        username: 'newuser',
        password: 'password123',
        confirmPassword: 'password123',
      })

      expect(mockAccountRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'newuser',
          playerId: mockGuestPlayer.id,
        })
      )
    })

    it('should call passwordHasher.hash with password', async () => {
      await useCase.execute({
        sessionId: 'session-id-12345',
        username: 'newuser',
        password: 'password123',
        confirmPassword: 'password123',
      })

      expect(mockPasswordHasher.hash).toHaveBeenCalledWith('password123')
    })

    it('should save account with hashed password', async () => {
      await useCase.execute({
        sessionId: 'session-id-12345',
        username: 'newuser',
        password: 'password123',
        confirmPassword: 'password123',
      })

      expect(mockAccountRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          passwordHash: mockPasswordHash,
        })
      )
    })
  })

  describe('execute - Validation Errors', () => {
    it('should reject mismatched passwords', async () => {
      const result = await useCase.execute({
        sessionId: 'session-id-12345',
        username: 'newuser',
        password: 'password123',
        confirmPassword: 'different123',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('VALIDATION_ERROR')
        expect(result.message).toContain('Passwords do not match')
      }
    })

    it('should reject invalid username format', async () => {
      const result = await useCase.execute({
        sessionId: 'session-id-12345',
        username: 'ab', // too short
        password: 'password123',
        confirmPassword: 'password123',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('VALIDATION_ERROR')
      }
    })

    it('should reject weak password', async () => {
      const result = await useCase.execute({
        sessionId: 'session-id-12345',
        username: 'newuser',
        password: 'short', // too short, no numbers
        confirmPassword: 'short',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('VALIDATION_ERROR')
      }
    })

    it('should reject invalid email format', async () => {
      const result = await useCase.execute({
        sessionId: 'session-id-12345',
        username: 'newuser',
        password: 'password123',
        confirmPassword: 'password123',
        email: 'invalid-email',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('VALIDATION_ERROR')
      }
    })
  })

  describe('execute - Conflict Errors', () => {
    it('should reject duplicate username', async () => {
      mockAccountRepository.findByUsername = vi.fn().mockResolvedValue({
        id: 'existing-account-id' as AccountId,
        username: 'newuser',
      })

      const result = await useCase.execute({
        sessionId: 'session-id-12345',
        username: 'newuser',
        password: 'password123',
        confirmPassword: 'password123',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('CONFLICT')
        expect(result.message).toContain('Username already exists')
      }
    })

    it('should reject duplicate email', async () => {
      mockAccountRepository.findByEmail = vi.fn().mockResolvedValue({
        id: 'existing-account-id' as AccountId,
        email: 'test@example.com',
      })

      const result = await useCase.execute({
        sessionId: 'session-id-12345',
        username: 'newuser',
        password: 'password123',
        confirmPassword: 'password123',
        email: 'test@example.com',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('CONFLICT')
        expect(result.message).toContain('Email already exists')
      }
    })
  })

  describe('execute - Guest Data Migration (FR-009)', () => {
    it('should convert guest player to registered player', async () => {
      const result = await useCase.execute({
        sessionId: 'session-id-12345',
        username: 'newuser',
        password: 'password123',
        confirmPassword: 'password123',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        // Player should be upgraded from guest to registered
        expect(result.data.player.isGuest).toBe(false)
        expect(result.data.player.displayName).toBe('newuser')
        // Player ID should remain the same (data migration)
        expect(result.data.player.id).toBe(mockGuestPlayer.id)
      }
    })

    it('should update player in repository with new display name', async () => {
      await useCase.execute({
        sessionId: 'session-id-12345',
        username: 'newuser',
        password: 'password123',
        confirmPassword: 'password123',
      })

      expect(mockPlayerRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockGuestPlayer.id,
          displayName: 'newuser',
          isGuest: false,
        })
      )
    })

    it('should preserve player createdAt during migration', async () => {
      await useCase.execute({
        sessionId: 'session-id-12345',
        username: 'newuser',
        password: 'password123',
        confirmPassword: 'password123',
      })

      expect(mockPlayerRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          createdAt: mockGuestPlayer.createdAt,
        })
      )
    })

    it('should link account to existing guest player id', async () => {
      await useCase.execute({
        sessionId: 'session-id-12345',
        username: 'newuser',
        password: 'password123',
        confirmPassword: 'password123',
      })

      expect(mockAccountRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          playerId: mockGuestPlayer.id,
        })
      )
    })
  })

  describe('execute - Session Handling', () => {
    it('should reject invalid session', async () => {
      mockSessionStore.findById = vi.fn().mockResolvedValue(null)

      const result = await useCase.execute({
        sessionId: 'invalid-session',
        username: 'newuser',
        password: 'password123',
        confirmPassword: 'password123',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('UNAUTHORIZED')
      }
    })

    it('should reject if player not found', async () => {
      mockPlayerRepository.findById = vi.fn().mockResolvedValue(null)

      const result = await useCase.execute({
        sessionId: 'session-id-12345',
        username: 'newuser',
        password: 'password123',
        confirmPassword: 'password123',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('NOT_FOUND')
      }
    })

    it('should reject if player already has an account', async () => {
      mockAccountRepository.findByPlayerId = vi.fn().mockResolvedValue({
        id: 'existing-account-id' as AccountId,
        playerId: mockGuestPlayer.id,
      })

      const result = await useCase.execute({
        sessionId: 'session-id-12345',
        username: 'newuser',
        password: 'password123',
        confirmPassword: 'password123',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('CONFLICT')
        expect(result.message).toContain('already registered')
      }
    })
  })
})
