/**
 * GuestToken Value Object Tests
 *
 * @description
 * 測試 GuestToken 的建立、驗證與過期邏輯。
 *
 * 參考: specs/010-player-account/data-model.md#1.5-GuestToken
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  type PlayerId,
  createGuestToken,
  isGuestTokenExpired,
  GUEST_TOKEN_MAX_AGE_MS,
} from '~~/server/identity/domain/types/guest-token'

describe('GuestToken Value Object', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('createGuestToken', () => {
    it('should create a guest token with player id', () => {
      const playerId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479' as PlayerId

      const token = createGuestToken(playerId)

      expect(token.playerId).toBe(playerId)
      expect(token.token).toBeDefined()
      expect(token.token.length).toBeGreaterThan(0)
      expect(token.expiresAt).toBeInstanceOf(Date)
    })

    it('should set expiration to 30 days from now', () => {
      const now = new Date('2026-01-02T00:00:00Z')
      vi.setSystemTime(now)

      const playerId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479' as PlayerId
      const token = createGuestToken(playerId)

      const expectedExpiry = new Date(now.getTime() + GUEST_TOKEN_MAX_AGE_MS)
      expect(token.expiresAt.getTime()).toBe(expectedExpiry.getTime())
    })

    it('should generate unique tokens', () => {
      const playerId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479' as PlayerId

      const token1 = createGuestToken(playerId)
      const token2 = createGuestToken(playerId)

      expect(token1.token).not.toBe(token2.token)
    })
  })

  describe('isGuestTokenExpired', () => {
    it('should return false for non-expired token', () => {
      const now = new Date('2026-01-02T00:00:00Z')
      vi.setSystemTime(now)

      const playerId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479' as PlayerId
      const token = createGuestToken(playerId)

      // Check 29 days later - should still be valid
      vi.setSystemTime(new Date(now.getTime() + 29 * 24 * 60 * 60 * 1000))
      expect(isGuestTokenExpired(token)).toBe(false)
    })

    it('should return true for expired token', () => {
      const now = new Date('2026-01-02T00:00:00Z')
      vi.setSystemTime(now)

      const playerId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479' as PlayerId
      const token = createGuestToken(playerId)

      // Check 31 days later - should be expired
      vi.setSystemTime(new Date(now.getTime() + 31 * 24 * 60 * 60 * 1000))
      expect(isGuestTokenExpired(token)).toBe(true)
    })

    it('should return true for token expiring exactly at current time', () => {
      const now = new Date('2026-01-02T00:00:00Z')
      vi.setSystemTime(now)

      const playerId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479' as PlayerId
      const token = createGuestToken(playerId)

      // Set time exactly to expiration
      vi.setSystemTime(token.expiresAt)
      expect(isGuestTokenExpired(token)).toBe(true)
    })
  })

  describe('GUEST_TOKEN_MAX_AGE_MS', () => {
    it('should be 30 days in milliseconds', () => {
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000
      expect(GUEST_TOKEN_MAX_AGE_MS).toBe(thirtyDaysMs)
    })
  })
})
