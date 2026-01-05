/**
 * PasswordHash Value Object
 *
 * @description
 * 密碼雜湊的 Domain 型別定義與驗證邏輯。
 * 不包含具體加密實作，符合 Clean Architecture 原則。
 *
 * 加密實作由 Adapter Layer 的 PasswordHashPort 提供。
 *
 * 參考: specs/010-player-account/research.md#2-密碼雜湊演算法
 */

import { VALIDATION_RULES } from '#shared/contracts/identity-types'

// =============================================================================
// Types
// =============================================================================

/**
 * 支援的雜湊演算法
 */
export type PasswordHashAlgorithm = 'bcrypt' | 'argon2'

/**
 * 密碼雜湊資料結構
 */
export interface PasswordHash {
  readonly hash: string
  readonly algorithm: PasswordHashAlgorithm
}

// =============================================================================
// Password Validation Functions
// =============================================================================

/**
 * 驗證密碼強度
 *
 * 規則：至少 8 字元，包含字母與數字
 *
 * @param password - 要驗證的密碼
 * @returns 密碼是否符合強度要求
 */
export function isValidPassword(password: string): boolean {
  const { minLength, pattern } = VALIDATION_RULES.password
  return password.length >= minLength && pattern.test(password)
}

/**
 * 檢查是否為 OAuth 專用密碼雜湊
 *
 * OAuth 帳號使用特殊標記，無法進行密碼驗證
 *
 * @param passwordHash - 密碼雜湊
 * @returns 是否為 OAuth 專用雜湊
 */
export function isOAuthPasswordHash(passwordHash: PasswordHash): boolean {
  return passwordHash.hash.startsWith('$oauth$')
}

/**
 * 建立 OAuth 專用密碼雜湊
 *
 * @returns OAuth 專用的 PasswordHash
 */
export function createOAuthPasswordHash(): PasswordHash {
  return Object.freeze({
    hash: '$oauth$',
    algorithm: 'bcrypt' as const,
  })
}
