/**
 * BcryptPasswordHasher Adapter Tests
 *
 * @description
 * 測試 bcrypt 密碼雜湊的建立與驗證。
 *
 * 參考: specs/010-player-account/research.md#2-密碼雜湊演算法
 */

import { describe, it, expect } from 'vitest'
import { BcryptPasswordHasher } from '~~/server/identity/adapters/crypto/bcrypt-password-hasher'

describe('BcryptPasswordHasher', () => {
  const hasher = new BcryptPasswordHasher()

  describe('hash', () => {
    it('should create a bcrypt hash', async () => {
      const hash = await hasher.hash('password123')

      expect(hash.algorithm).toBe('bcrypt')
      expect(hash.hash).toMatch(/^\$2[aby]\$\d+\$/)
    })

    it('should create different hashes for same password (due to salt)', async () => {
      const hash1 = await hasher.hash('password123')
      const hash2 = await hasher.hash('password123')

      expect(hash1.hash).not.toBe(hash2.hash)
    })

    it('should create frozen object', async () => {
      const hash = await hasher.hash('password123')

      expect(Object.isFrozen(hash)).toBe(true)
    })
  })

  describe('verify', () => {
    it('should verify correct password', async () => {
      const hash = await hasher.hash('password123')

      const result = await hasher.verify('password123', hash)

      expect(result).toBe(true)
    })

    it('should reject incorrect password', async () => {
      const hash = await hasher.hash('password123')

      const result = await hasher.verify('wrongpassword1', hash)

      expect(result).toBe(false)
    })

    it('should reject similar but different passwords', async () => {
      const hash = await hasher.hash('password123')

      expect(await hasher.verify('Password123', hash)).toBe(false) // different case
      expect(await hasher.verify('password1234', hash)).toBe(false) // extra char
      expect(await hasher.verify('password12', hash)).toBe(false) // missing char
    })

    it('should handle empty password correctly', async () => {
      const hash = await hasher.hash('validpass1')

      const result = await hasher.verify('', hash)

      expect(result).toBe(false)
    })
  })
})
