/**
 * OAuthLink Entity Unit Tests
 *
 * @description
 * 測試 OAuthLink Entity 的業務邏輯。
 *
 * 參考: specs/010-player-account/data-model.md#1.3-OAuthLink
 */

import { describe, it, expect } from 'vitest'
import {
  createOAuthLink,
  isValidOAuthProvider,
  isValidProviderUserId,
  type OAuthLinkId,
} from '../../../../server/identity/domain/oauth-link/oauth-link'
import type { AccountId } from '../../../../server/identity/domain/account/account'

// =============================================================================
// Test Suite
// =============================================================================

describe('OAuthLink Entity', () => {
  describe('isValidOAuthProvider', () => {
    it('should accept google as valid provider', () => {
      expect(isValidOAuthProvider('google')).toBe(true)
    })

    it('should accept line as valid provider', () => {
      expect(isValidOAuthProvider('line')).toBe(true)
    })

    it('should reject invalid providers', () => {
      expect(isValidOAuthProvider('facebook')).toBe(false)
      expect(isValidOAuthProvider('twitter')).toBe(false)
      expect(isValidOAuthProvider('')).toBe(false)
      expect(isValidOAuthProvider('GOOGLE')).toBe(false)
    })
  })

  describe('isValidProviderUserId', () => {
    it('should accept valid provider user IDs', () => {
      expect(isValidProviderUserId('123456789')).toBe(true)
      expect(isValidProviderUserId('user@example.com')).toBe(true)
      expect(isValidProviderUserId('abc-123-xyz')).toBe(true)
    })

    it('should reject empty provider user IDs', () => {
      expect(isValidProviderUserId('')).toBe(false)
      expect(isValidProviderUserId('   ')).toBe(false)
    })
  })

  describe('createOAuthLink', () => {
    it('should create OAuthLink with valid data', () => {
      const now = new Date()
      const link = createOAuthLink({
        id: 'link-123' as OAuthLinkId,
        accountId: 'account-123' as AccountId,
        provider: 'google',
        providerUserId: '123456789',
        providerEmail: 'user@gmail.com',
        createdAt: now,
      })

      expect(link.id).toBe('link-123')
      expect(link.accountId).toBe('account-123')
      expect(link.provider).toBe('google')
      expect(link.providerUserId).toBe('123456789')
      expect(link.providerEmail).toBe('user@gmail.com')
      expect(link.createdAt).toBe(now)
    })

    it('should create OAuthLink with null email', () => {
      const link = createOAuthLink({
        id: 'link-123' as OAuthLinkId,
        accountId: 'account-123' as AccountId,
        provider: 'line',
        providerUserId: 'line-user-id',
        providerEmail: null,
        createdAt: new Date(),
      })

      expect(link.providerEmail).toBeNull()
    })

    it('should throw error for invalid provider', () => {
      expect(() =>
        createOAuthLink({
          id: 'link-123' as OAuthLinkId,
          accountId: 'account-123' as AccountId,
          provider: 'facebook' as any,
          providerUserId: '123',
          providerEmail: null,
          createdAt: new Date(),
        })
      ).toThrow('Invalid OAuth provider')
    })

    it('should throw error for empty provider user ID', () => {
      expect(() =>
        createOAuthLink({
          id: 'link-123' as OAuthLinkId,
          accountId: 'account-123' as AccountId,
          provider: 'google',
          providerUserId: '',
          providerEmail: null,
          createdAt: new Date(),
        })
      ).toThrow('Provider user ID is required')
    })
  })
})

describe('OAuthLink - Provider Specific', () => {
  describe('Google OAuth', () => {
    it('should accept typical Google user ID format', () => {
      const link = createOAuthLink({
        id: 'link-123' as OAuthLinkId,
        accountId: 'account-123' as AccountId,
        provider: 'google',
        providerUserId: '118234567890123456789',
        providerEmail: 'user@gmail.com',
        createdAt: new Date(),
      })

      expect(link.provider).toBe('google')
    })
  })

  describe('Line OAuth', () => {
    it('should accept typical Line user ID format', () => {
      const link = createOAuthLink({
        id: 'link-123' as OAuthLinkId,
        accountId: 'account-123' as AccountId,
        provider: 'line',
        providerUserId: 'U1234567890abcdef1234567890abcdef',
        providerEmail: null, // Line may not provide email
        createdAt: new Date(),
      })

      expect(link.provider).toBe('line')
    })
  })
})
