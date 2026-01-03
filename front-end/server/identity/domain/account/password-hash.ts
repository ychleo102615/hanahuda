/**
 * PasswordHash Value Object
 *
 * @description
 * 密碼雜湊值，使用 bcryptjs 進行雜湊。
 *
 * 參考: specs/010-player-account/research.md#2-密碼雜湊演算法
 */

import bcrypt from 'bcryptjs'
import { VALIDATION_RULES } from '#shared/contracts/identity-types'

// =============================================================================
// Constants
// =============================================================================

/**
 * bcrypt 成本因子（rounds）
 *
 * 10 rounds ≈ 100ms 在現代硬體上
 */
const BCRYPT_ROUNDS = 10

// =============================================================================
// Types
// =============================================================================

/**
 * 密碼雜湊資料結構
 */
export interface PasswordHash {
  readonly hash: string
  readonly algorithm: 'bcrypt'
}

// =============================================================================
// Password Functions
// =============================================================================

/**
 * 驗證密碼強度
 *
 * 規則：至少 8 字元，包含字母與數字
 */
export function isValidPassword(password: string): boolean {
  const { minLength, pattern } = VALIDATION_RULES.password
  return password.length >= minLength && pattern.test(password)
}

/**
 * 建立密碼雜湊
 *
 * @param password - 原始密碼
 * @returns PasswordHash 物件
 * @throws Error 如果密碼不符合強度要求
 */
export async function createPasswordHash(password: string): Promise<PasswordHash> {
  if (!isValidPassword(password)) {
    throw new Error('Invalid password: must be at least 8 characters with letters and numbers')
  }

  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS)

  return Object.freeze({
    hash,
    algorithm: 'bcrypt',
  })
}

/**
 * 驗證密碼是否正確
 *
 * @param password - 要驗證的密碼
 * @param passwordHash - 儲存的密碼雜湊
 * @returns 密碼是否正確
 */
export async function verifyPassword(
  password: string,
  passwordHash: PasswordHash,
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash.hash)
}
