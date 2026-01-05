/**
 * GetCurrentPlayerUseCase Tests
 *
 * @description
 * 測試取得當前玩家資訊的 Use Case。
 * 包含 Session 驗證與滑動過期處理。
 *
 * 參考: specs/010-player-account/spec.md FR-012, FR-018
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { GetCurrentPlayerUseCase } from '~~/server/identity/application/use-cases/get-current-player-use-case'
import type { PlayerRepositoryPort } from '~~/server/identity/application/ports/output/player-repository-port'
import type { SessionStorePort } from '~~/server/identity/application/ports/output/session-store-port'
import type { Player, PlayerId } from '~~/server/identity/domain/player/player'
import type { Session, SessionId } from '~~/server/identity/domain/types/session'

describe('GetCurrentPlayerUseCase', () => {
  let useCase: GetCurrentPlayerUseCase
  let mockPlayerRepository: PlayerRepositoryPort
  let mockSessionStore: SessionStorePort

  const mockPlayer: Player = {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' as PlayerId,
    displayName: 'Guest_ABCD',
    isGuest: true,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  }

  const createMockSession = (overrides?: Partial<Session>): Session => ({
    id: 'session-id-12345' as SessionId,
    playerId: mockPlayer.id,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    expiresAt: new Date('2026-01-08T00:00:00Z'), // 7 days later
    lastAccessedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  })

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-02T00:00:00Z'))

    mockPlayerRepository = {
      save: vi.fn(),
      findById: vi.fn().mockResolvedValue(mockPlayer),
      findByDisplayName: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    }

    mockSessionStore = {
      save: vi.fn(),
      findById: vi.fn().mockResolvedValue(createMockSession()),
      delete: vi.fn(),
      deleteByPlayerId: vi.fn(),
      refresh: vi.fn().mockImplementation((session: Session) => Promise.resolve({
        ...session,
        lastAccessedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      })),
    }

    useCase = new GetCurrentPlayerUseCase(mockPlayerRepository, mockSessionStore)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('execute', () => {
    it('should return player info for valid session', async () => {
      const result = await useCase.execute({ sessionId: 'session-id-12345' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe(mockPlayer.id)
        expect(result.data.displayName).toBe(mockPlayer.displayName)
        expect(result.data.isGuest).toBe(mockPlayer.isGuest)
        expect(result.data.isAuthenticated).toBe(true)
      }
    })

    it('should refresh session on each request (sliding expiration)', async () => {
      await useCase.execute({ sessionId: 'session-id-12345' })

      expect(mockSessionStore.refresh).toHaveBeenCalledTimes(1)
      expect(mockSessionStore.refresh).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'session-id-12345' })
      )
    })

    it('should return UNAUTHORIZED for non-existent session', async () => {
      mockSessionStore.findById = vi.fn().mockResolvedValue(null)

      const result = await useCase.execute({ sessionId: 'non-existent-session' })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('UNAUTHORIZED')
        expect(result.message).toContain('Session not found')
      }
    })

    it('should return UNAUTHORIZED for expired session', async () => {
      const expiredSession = createMockSession({
        expiresAt: new Date('2026-01-01T12:00:00Z'), // Already expired
      })
      mockSessionStore.findById = vi.fn().mockResolvedValue(expiredSession)

      const result = await useCase.execute({ sessionId: 'session-id-12345' })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('UNAUTHORIZED')
        expect(result.message).toContain('Session expired')
      }
    })

    it('should delete expired session from store', async () => {
      const expiredSession = createMockSession({
        expiresAt: new Date('2026-01-01T12:00:00Z'),
      })
      mockSessionStore.findById = vi.fn().mockResolvedValue(expiredSession)

      await useCase.execute({ sessionId: 'session-id-12345' })

      expect(mockSessionStore.delete).toHaveBeenCalledWith('session-id-12345')
    })

    it('should return NOT_FOUND when player no longer exists', async () => {
      mockPlayerRepository.findById = vi.fn().mockResolvedValue(null)

      const result = await useCase.execute({ sessionId: 'session-id-12345' })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('NOT_FOUND')
        expect(result.message).toContain('Player not found')
      }
    })

    it('should return UNAUTHORIZED when no session id provided', async () => {
      const result = await useCase.execute({ sessionId: '' })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('UNAUTHORIZED')
      }
    })

    it('should handle repository errors gracefully', async () => {
      mockPlayerRepository.findById = vi.fn().mockRejectedValue(new Error('DB Error'))

      const result = await useCase.execute({ sessionId: 'session-id-12345' })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('INTERNAL_ERROR')
      }
    })
  })
})
