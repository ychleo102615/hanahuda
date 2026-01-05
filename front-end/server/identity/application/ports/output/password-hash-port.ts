/**
 * Password Hash Port
 *
 * @description
 * 密碼雜湊服務的 Output Port 介面。
 * 由 Adapter Layer 實作（如 BcryptPasswordHasher）。
 *
 * 遵循 Clean Architecture 原則：
 * - Domain/Application Layer 不依賴具體加密庫
 * - 加密演算法可透過 Adapter 替換（bcrypt → Argon2 等）
 *
 * 參考: specs/010-player-account/plan.md - Application Layer
 */

import type { PasswordHash } from '../../../domain/account/password-hash'

/**
 * Password Hash Port
 *
 * 定義密碼雜湊操作的介面
 */
export abstract class PasswordHashPort {
  /**
   * 建立密碼雜湊
   *
   * @param password - 原始密碼（已通過驗證）
   * @returns PasswordHash 物件
   */
  abstract hash(password: string): Promise<PasswordHash>

  /**
   * 驗證密碼是否正確
   *
   * @param password - 要驗證的密碼
   * @param passwordHash - 儲存的密碼雜湊
   * @returns 密碼是否正確
   */
  abstract verify(password: string, passwordHash: PasswordHash): Promise<boolean>
}
