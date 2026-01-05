/**
 * PasswordHash Domain Tests
 *
 * @description
 * 測試密碼雜湊的 Domain 邏輯（驗證與類型）。
 * 加密實作測試請見 adapters/crypto/bcrypt-password-hasher.test.ts
 *
 * 參考: specs/010-player-account/data-model.md#1.2-Account
 */

import { describe, it, expect } from 'vitest'
import {
  isValidPassword,
  isOAuthPasswordHash,
  createOAuthPasswordHash,
  type PasswordHash,
} from '~~/server/identity/domain/account/password-hash'

describe('PasswordHash Domain', () => {
  describe('isValidPassword', () => {
    it('should accept valid passwords (8+ chars with letter and number)', () => {
      expect(isValidPassword('password1')).toBe(true)
      expect(isValidPassword('Pass1234')).toBe(true)
      expect(isValidPassword('abc12345')).toBe(true)
      expect(isValidPassword('1234abcd')).toBe(true)
      expect(isValidPassword('VeryLongPassword123')).toBe(true)
    })

    it('should reject passwords shorter than 8 chars', () => {
      expect(isValidPassword('pass1')).toBe(false)
      expect(isValidPassword('1234567')).toBe(false)
      expect(isValidPassword('abc123')).toBe(false)
    })

    it('should reject passwords without letters', () => {
      expect(isValidPassword('12345678')).toBe(false)
      expect(isValidPassword('123456789')).toBe(false)
    })

    it('should reject passwords without numbers', () => {
      expect(isValidPassword('password')).toBe(false)
      expect(isValidPassword('abcdefgh')).toBe(false)
    })

    it('should reject empty passwords', () => {
      expect(isValidPassword('')).toBe(false)
    })
  })

  describe('isOAuthPasswordHash', () => {
    it('should return true for OAuth password hash', () => {
      const oauthHash: PasswordHash = {
        hash: '$oauth$',
        algorithm: 'bcrypt',
      }
      expect(isOAuthPasswordHash(oauthHash)).toBe(true)
    })

    it('should return false for regular bcrypt hash', () => {
      const bcryptHash: PasswordHash = {
        hash: '$2a$10$abcdefghijklmnopqrstuvwxyz',
        algorithm: 'bcrypt',
      }
      expect(isOAuthPasswordHash(bcryptHash)).toBe(false)
    })
  })

  describe('createOAuthPasswordHash', () => {
    it('should create an OAuth password hash', () => {
      const hash = createOAuthPasswordHash()

      expect(hash.hash).toBe('$oauth$')
      expect(hash.algorithm).toBe('bcrypt')
    })

    it('should be frozen', () => {
      const hash = createOAuthPasswordHash()

      expect(Object.isFrozen(hash)).toBe(true)
    })
  })
})
