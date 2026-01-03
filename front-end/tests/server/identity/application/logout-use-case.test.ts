/**
 * LogoutUseCase Unit Tests
 *
 * @description
 * 測試登出 Use Case 的業務邏輯。
 *
 * 參考: specs/010-player-account/spec.md FR-013
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { LogoutUseCase } from '../../../../server/identity/application/use-cases/logout-use-case'
import type { SessionStorePort } from '../../../../server/identity/application/ports/output/session-store-port'
import type { Session, SessionId } from '../../../../server/identity/domain/types/session'
import type { PlayerId } from '../../../../server/identity/domain/player/player'

// =============================================================================
// Mocks
// =============================================================================

const mockSession: Session = {
  id: 'session-123' as SessionId,
  playerId: 'player-123' as PlayerId,
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  createdAt: new Date(),
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

describe('LogoutUseCase', () => {
  let useCase: LogoutUseCase
  let sessionStore: SessionStorePort

  beforeEach(() => {
    sessionStore = createMockSessionStore()
    useCase = new LogoutUseCase(sessionStore)

    // Reset all mocks
    vi.clearAllMocks()
  })

  describe('execute - Successful Logout', () => {
    it('should delete session on logout', async () => {
      // Arrange
      vi.mocked(sessionStore.findById).mockResolvedValue(mockSession)
      vi.mocked(sessionStore.delete).mockResolvedValue()

      // Act
      const result = await useCase.execute({
        sessionId: 'session-123',
      })

      // Assert
      expect(result.success).toBe(true)
      expect(sessionStore.delete).toHaveBeenCalledWith('session-123')
    })

    it('should succeed even if session does not exist', async () => {
      // Arrange - Session not found (already logged out or expired)
      vi.mocked(sessionStore.findById).mockResolvedValue(null)

      // Act
      const result = await useCase.execute({
        sessionId: 'non-existent-session',
      })

      // Assert - Should still succeed (idempotent)
      expect(result.success).toBe(true)
    })

    it('should return success response', async () => {
      // Arrange
      vi.mocked(sessionStore.findById).mockResolvedValue(mockSession)
      vi.mocked(sessionStore.delete).mockResolvedValue()

      // Act
      const result = await useCase.execute({
        sessionId: 'session-123',
      })

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.success).toBe(true)
      }
    })
  })

  describe('execute - Validation Errors', () => {
    it('should fail when sessionId is empty', async () => {
      // Act
      const result = await useCase.execute({
        sessionId: '',
      })

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('VALIDATION_ERROR')
        expect(result.message).toContain('Session ID is required')
      }
    })
  })

  describe('execute - Error Handling', () => {
    it('should handle session store errors gracefully', async () => {
      // Arrange
      vi.mocked(sessionStore.findById).mockRejectedValue(new Error('Store error'))

      // Act
      const result = await useCase.execute({
        sessionId: 'session-123',
      })

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('INTERNAL_ERROR')
      }
    })

    it('should handle delete errors gracefully', async () => {
      // Arrange
      vi.mocked(sessionStore.findById).mockResolvedValue(mockSession)
      vi.mocked(sessionStore.delete).mockRejectedValue(new Error('Delete error'))

      // Act
      const result = await useCase.execute({
        sessionId: 'session-123',
      })

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('INTERNAL_ERROR')
      }
    })
  })
})
