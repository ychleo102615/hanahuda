/**
 * Bcrypt Password Hasher
 *
 * @description
 * PasswordHashPort 的 bcrypt 實作。
 * 將 bcrypt 依賴封裝在 Adapter Layer，符合 Clean Architecture 原則。
 *
 * 參考: specs/010-player-account/research.md#2-密碼雜湊演算法
 */

import bcrypt from 'bcryptjs'
import { PasswordHashPort } from '../../application/ports/output/password-hash-port'
import type { PasswordHash } from '../../domain/account/password-hash'

// =============================================================================
// Constants
// =============================================================================

/**
 * bcrypt 成本因子（rounds）
 *
 * 10 rounds ≈ 100ms 在現代硬體上
 * 可透過環境變數調整（生產環境可考慮 12）
 */
const BCRYPT_ROUNDS = 10

// =============================================================================
// Adapter Implementation
// =============================================================================

/**
 * Bcrypt Password Hasher
 *
 * 使用 bcryptjs 實作密碼雜湊
 */
export class BcryptPasswordHasher extends PasswordHashPort {
  /**
   * 建立密碼雜湊
   *
   * @param password - 原始密碼
   * @returns PasswordHash 物件
   */
  async hash(password: string): Promise<PasswordHash> {
    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS)

    return Object.freeze({
      hash,
      algorithm: 'bcrypt' as const,
    })
  }

  /**
   * 驗證密碼是否正確
   *
   * @param password - 要驗證的密碼
   * @param passwordHash - 儲存的密碼雜湊
   * @returns 密碼是否正確
   */
  async verify(password: string, passwordHash: PasswordHash): Promise<boolean> {
    return bcrypt.compare(password, passwordHash.hash)
  }
}
