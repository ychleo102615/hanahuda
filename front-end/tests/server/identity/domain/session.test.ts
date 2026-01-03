/**
 * Session Value Object Tests
 *
 * @description
 * 測試 Session 的建立、驗證與滑動過期邏輯 (FR-012)。
 *
 * 參考: specs/010-player-account/data-model.md#1.4-Session
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  type Session,
  type SessionId,
  type PlayerId,
  createSession,
  isSessionExpired,
  refreshSession,
  SESSION_MAX_AGE_MS,
} from '~~/server/identity/domain/types/session'

describe('Session Value Object', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('createSession', () => {
    it('should create a session with player id', () => {
      const playerId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479' as PlayerId

      const session = createSession(playerId)

      expect(session.playerId).toBe(playerId)
      expect(session.id).toBeDefined()
      expect(session.id.length).toBe(43) // base64url encoded 32 bytes
      expect(session.createdAt).toBeInstanceOf(Date)
      expect(session.expiresAt).toBeInstanceOf(Date)
      expect(session.lastAccessedAt).toBeInstanceOf(Date)
    })

    it('should set expiration to 7 days from now', () => {
      const now = new Date('2026-01-02T00:00:00Z')
      vi.setSystemTime(now)

      const playerId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479' as PlayerId
      const session = createSession(playerId)

      const expectedExpiry = new Date(now.getTime() + SESSION_MAX_AGE_MS)
      expect(session.expiresAt.getTime()).toBe(expectedExpiry.getTime())
    })

    it('should generate unique session ids', () => {
      const playerId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479' as PlayerId

      const session1 = createSession(playerId)
      const session2 = createSession(playerId)

      expect(session1.id).not.toBe(session2.id)
    })
  })

  describe('isSessionExpired', () => {
    it('should return false for non-expired session', () => {
      const now = new Date('2026-01-02T00:00:00Z')
      vi.setSystemTime(now)

      const playerId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479' as PlayerId
      const session = createSession(playerId)

      // Check 6 days later - should still be valid
      vi.setSystemTime(new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000))
      expect(isSessionExpired(session)).toBe(false)
    })

    it('should return true for expired session', () => {
      const now = new Date('2026-01-02T00:00:00Z')
      vi.setSystemTime(now)

      const playerId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479' as PlayerId
      const session = createSession(playerId)

      // Check 8 days later - should be expired
      vi.setSystemTime(new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000))
      expect(isSessionExpired(session)).toBe(true)
    })
  })

  describe('refreshSession (sliding expiration FR-012)', () => {
    it('should update lastAccessedAt to current time', () => {
      const now = new Date('2026-01-02T00:00:00Z')
      vi.setSystemTime(now)

      const playerId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479' as PlayerId
      const session = createSession(playerId)

      // Move time forward 1 day
      const later = new Date('2026-01-03T00:00:00Z')
      vi.setSystemTime(later)

      const refreshed = refreshSession(session)

      expect(refreshed.lastAccessedAt.getTime()).toBe(later.getTime())
    })

    it('should extend expiresAt by 7 days from current time', () => {
      const now = new Date('2026-01-02T00:00:00Z')
      vi.setSystemTime(now)

      const playerId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479' as PlayerId
      const session = createSession(playerId)

      // Original expiry is 7 days from creation
      const originalExpiry = session.expiresAt

      // Move time forward 3 days
      const later = new Date('2026-01-05T00:00:00Z')
      vi.setSystemTime(later)

      const refreshed = refreshSession(session)

      // New expiry should be 7 days from refresh time
      const expectedNewExpiry = new Date(later.getTime() + SESSION_MAX_AGE_MS)
      expect(refreshed.expiresAt.getTime()).toBe(expectedNewExpiry.getTime())
      expect(refreshed.expiresAt.getTime()).toBeGreaterThan(originalExpiry.getTime())
    })

    it('should preserve session id, playerId, and createdAt', () => {
      const now = new Date('2026-01-02T00:00:00Z')
      vi.setSystemTime(now)

      const playerId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479' as PlayerId
      const session = createSession(playerId)

      vi.setSystemTime(new Date('2026-01-03T00:00:00Z'))
      const refreshed = refreshSession(session)

      expect(refreshed.id).toBe(session.id)
      expect(refreshed.playerId).toBe(session.playerId)
      expect(refreshed.createdAt.getTime()).toBe(session.createdAt.getTime())
    })

    it('should not refresh already expired session', () => {
      const now = new Date('2026-01-02T00:00:00Z')
      vi.setSystemTime(now)

      const playerId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479' as PlayerId
      const session = createSession(playerId)

      // Move time forward 8 days (past expiration)
      vi.setSystemTime(new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000))

      expect(() => refreshSession(session)).toThrow('Cannot refresh expired session')
    })
  })

  describe('SESSION_MAX_AGE_MS', () => {
    it('should be 7 days in milliseconds', () => {
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
      expect(SESSION_MAX_AGE_MS).toBe(sevenDaysMs)
    })
  })
})
