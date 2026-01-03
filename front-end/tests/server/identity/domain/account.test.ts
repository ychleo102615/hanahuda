/**
 * Account Entity Tests
 *
 * @description
 * 測試 Account Entity 的建立與驗證。
 *
 * 參考: specs/010-player-account/data-model.md#1.2-Account
 */

import { describe, it, expect } from 'vitest'
import {
  type Account,
  type AccountId,
  type PlayerId,
  createAccount,
  isValidUsername,
  isValidEmail,
} from '~~/server/identity/domain/account/account'
import type { PasswordHash } from '~~/server/identity/domain/account/password-hash'

describe('Account Entity', () => {
  const validPlayerId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479' as PlayerId
  const validPasswordHash: PasswordHash = {
    hash: '$2b$10$abcdefghijklmnopqrstuvwxyz012345678901234567890123456',
    algorithm: 'bcrypt',
  }

  describe('Username validation', () => {
    it('should accept valid usernames (3-20 chars, alphanumeric + underscore)', () => {
      expect(isValidUsername('abc')).toBe(true)
      expect(isValidUsername('user_123')).toBe(true)
      expect(isValidUsername('Player1')).toBe(true)
      expect(isValidUsername('A'.repeat(20))).toBe(true)
    })

    it('should reject usernames shorter than 3 chars', () => {
      expect(isValidUsername('ab')).toBe(false)
      expect(isValidUsername('a')).toBe(false)
      expect(isValidUsername('')).toBe(false)
    })

    it('should reject usernames longer than 20 chars', () => {
      expect(isValidUsername('A'.repeat(21))).toBe(false)
    })

    it('should reject usernames with invalid characters', () => {
      expect(isValidUsername('user@name')).toBe(false)
      expect(isValidUsername('user-name')).toBe(false)
      expect(isValidUsername('user name')).toBe(false)
      expect(isValidUsername('user.name')).toBe(false)
      expect(isValidUsername('用戶名')).toBe(false)
    })
  })

  describe('Email validation', () => {
    it('should accept valid emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true)
      expect(isValidEmail('user.name@domain.org')).toBe(true)
      expect(isValidEmail('user+tag@example.co.uk')).toBe(true)
    })

    it('should accept null email (optional)', () => {
      expect(isValidEmail(null)).toBe(true)
    })

    it('should reject invalid emails', () => {
      expect(isValidEmail('notanemail')).toBe(false)
      expect(isValidEmail('missing@domain')).toBe(false)
      expect(isValidEmail('@nodomain.com')).toBe(false)
      expect(isValidEmail('spaces in@email.com')).toBe(false)
    })
  })

  describe('createAccount', () => {
    it('should create an account with valid inputs', () => {
      const now = new Date()
      const account = createAccount({
        id: 'a47ac10b-58cc-4372-a567-0e02b2c3d479' as AccountId,
        playerId: validPlayerId,
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: validPasswordHash,
        createdAt: now,
        updatedAt: now,
      })

      expect(account.id).toBe('a47ac10b-58cc-4372-a567-0e02b2c3d479')
      expect(account.playerId).toBe(validPlayerId)
      expect(account.username).toBe('testuser')
      expect(account.email).toBe('test@example.com')
      expect(account.passwordHash).toEqual(validPasswordHash)
    })

    it('should create an account with null email', () => {
      const account = createAccount({
        id: 'a47ac10b-58cc-4372-a567-0e02b2c3d479' as AccountId,
        playerId: validPlayerId,
        username: 'testuser',
        email: null,
        passwordHash: validPasswordHash,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      expect(account.email).toBeNull()
    })

    it('should throw error for invalid username', () => {
      expect(() => createAccount({
        id: 'a47ac10b-58cc-4372-a567-0e02b2c3d479' as AccountId,
        playerId: validPlayerId,
        username: 'ab', // too short
        email: null,
        passwordHash: validPasswordHash,
        createdAt: new Date(),
        updatedAt: new Date(),
      })).toThrow('Invalid username')
    })

    it('should throw error for invalid email format', () => {
      expect(() => createAccount({
        id: 'a47ac10b-58cc-4372-a567-0e02b2c3d479' as AccountId,
        playerId: validPlayerId,
        username: 'testuser',
        email: 'invalid-email',
        passwordHash: validPasswordHash,
        createdAt: new Date(),
        updatedAt: new Date(),
      })).toThrow('Invalid email')
    })

    it('should throw error for invalid account id', () => {
      expect(() => createAccount({
        id: 'not-a-uuid' as AccountId,
        playerId: validPlayerId,
        username: 'testuser',
        email: null,
        passwordHash: validPasswordHash,
        createdAt: new Date(),
        updatedAt: new Date(),
      })).toThrow('Invalid account ID')
    })
  })
})
