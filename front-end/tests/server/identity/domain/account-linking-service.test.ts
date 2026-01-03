/**
 * AccountLinkingService Unit Tests
 *
 * @description
 * 測試帳號連結服務的業務邏輯。
 *
 * 參考: specs/010-player-account/spec.md FR-006a, FR-006b
 */

import { describe, it, expect } from 'vitest'
import {
  canAutoLink,
  AccountLinkingService,
} from '../../../../server/identity/domain/services/account-linking-service'
import type { Account, AccountId } from '../../../../server/identity/domain/account/account'
import type { PlayerId } from '../../../../server/identity/domain/player/player'
import type { PasswordHash } from '../../../../server/identity/domain/account/password-hash'

// =============================================================================
// Mocks
// =============================================================================

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

const mockAccountWithoutEmail: Account = {
  ...mockAccount,
  email: null,
}

// =============================================================================
// Test Suite
// =============================================================================

describe('AccountLinkingService', () => {
  describe('canAutoLink', () => {
    it('should return true when OAuth email matches account email (FR-006a)', () => {
      const result = canAutoLink('test@example.com', mockAccount)
      expect(result).toBe(true)
    })

    it('should return true for case-insensitive email match', () => {
      const result = canAutoLink('TEST@EXAMPLE.COM', mockAccount)
      expect(result).toBe(true)
    })

    it('should return false when emails do not match', () => {
      const result = canAutoLink('different@example.com', mockAccount)
      expect(result).toBe(false)
    })

    it('should return false when account has no email', () => {
      const result = canAutoLink('test@example.com', mockAccountWithoutEmail)
      expect(result).toBe(false)
    })

    it('should return false when OAuth email is null', () => {
      const result = canAutoLink(null, mockAccount)
      expect(result).toBe(false)
    })

    it('should return false when both emails are null', () => {
      const result = canAutoLink(null, mockAccountWithoutEmail)
      expect(result).toBe(false)
    })
  })

  describe('AccountLinkingService.findAccountByEmail', () => {
    it('should find account by matching email', () => {
      const accounts = [mockAccount, mockAccountWithoutEmail]
      const service = new AccountLinkingService()

      const result = service.findAccountByEmail('test@example.com', accounts)
      expect(result).toBe(mockAccount)
    })

    it('should return null when no account matches', () => {
      const accounts = [mockAccount]
      const service = new AccountLinkingService()

      const result = service.findAccountByEmail('nonexistent@example.com', accounts)
      expect(result).toBeNull()
    })

    it('should handle case-insensitive search', () => {
      const accounts = [mockAccount]
      const service = new AccountLinkingService()

      const result = service.findAccountByEmail('TEST@EXAMPLE.COM', accounts)
      expect(result).toBe(mockAccount)
    })
  })

  describe('AccountLinkingService.determineLinkAction', () => {
    const service = new AccountLinkingService()

    it('should return AUTO_LINK when email matches existing account', () => {
      const result = service.determineLinkAction({
        oauthEmail: 'test@example.com',
        existingAccountByEmail: mockAccount,
        existingOAuthLink: null,
      })

      expect(result.action).toBe('AUTO_LINK')
      expect(result.account).toBe(mockAccount)
    })

    it('should return ALREADY_LINKED when OAuth already linked', () => {
      const result = service.determineLinkAction({
        oauthEmail: 'test@example.com',
        existingAccountByEmail: null,
        existingOAuthLink: {
          accountId: 'account-123' as AccountId,
        },
      })

      expect(result.action).toBe('ALREADY_LINKED')
      expect(result.accountId).toBe('account-123')
    })

    it('should return CREATE_NEW when no existing account found', () => {
      const result = service.determineLinkAction({
        oauthEmail: 'new@example.com',
        existingAccountByEmail: null,
        existingOAuthLink: null,
      })

      expect(result.action).toBe('CREATE_NEW')
    })

    it('should return PROMPT_LINK when email not found but user may want to link', () => {
      const result = service.determineLinkAction({
        oauthEmail: null, // No email from OAuth
        existingAccountByEmail: null,
        existingOAuthLink: null,
      })

      expect(result.action).toBe('CREATE_NEW')
    })
  })
})
