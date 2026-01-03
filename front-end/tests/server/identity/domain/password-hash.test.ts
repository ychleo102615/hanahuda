/**
 * PasswordHash Value Object Tests
 *
 * @description
 * 測試密碼雜湊的建立與驗證。
 * 使用 bcryptjs 進行密碼雜湊。
 *
 * 參考: specs/010-player-account/data-model.md#1.2-Account
 */

import { describe, it, expect } from 'vitest'
import {
  createPasswordHash,
  verifyPassword,
  isValidPassword,
  type PasswordHash,
} from '~~/server/identity/domain/account/password-hash'

describe('PasswordHash Value Object', () => {
  describe('Password validation', () => {
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

  describe('createPasswordHash', () => {
    it('should create a bcrypt hash', async () => {
      const hash = await createPasswordHash('password123')

      expect(hash.algorithm).toBe('bcrypt')
      expect(hash.hash).toMatch(/^\$2[aby]\$\d+\$/)
    })

    it('should create different hashes for same password', async () => {
      const hash1 = await createPasswordHash('password123')
      const hash2 = await createPasswordHash('password123')

      expect(hash1.hash).not.toBe(hash2.hash)
    })

    it('should throw error for invalid password', async () => {
      await expect(createPasswordHash('short')).rejects.toThrow('Invalid password')
      await expect(createPasswordHash('nodigits')).rejects.toThrow('Invalid password')
      await expect(createPasswordHash('12345678')).rejects.toThrow('Invalid password')
    })
  })

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const hash = await createPasswordHash('password123')

      const result = await verifyPassword('password123', hash)

      expect(result).toBe(true)
    })

    it('should reject incorrect password', async () => {
      const hash = await createPasswordHash('password123')

      const result = await verifyPassword('wrongpassword1', hash)

      expect(result).toBe(false)
    })

    it('should reject similar but different passwords', async () => {
      const hash = await createPasswordHash('password123')

      expect(await verifyPassword('Password123', hash)).toBe(false) // different case
      expect(await verifyPassword('password1234', hash)).toBe(false) // extra char
      expect(await verifyPassword('password12', hash)).toBe(false) // missing char
    })
  })
})
