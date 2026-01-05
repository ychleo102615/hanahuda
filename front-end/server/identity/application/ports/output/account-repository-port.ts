/**
 * Account Repository Port
 *
 * @description
 * Account 持久化的 Output Port 介面。
 * 由 Adapter Layer 實作。
 *
 * 參考: specs/010-player-account/plan.md - Application Layer
 */

import type { Account, AccountId, PlayerId } from '../../../domain/account/account'

/**
 * Account Repository Port
 *
 * 定義 Account 持久化操作的介面
 */
export abstract class AccountRepositoryPort {
  /**
   * 儲存新的 Account
   */
  abstract save(account: Account): Promise<Account>

  /**
   * 根據 ID 查詢 Account
   */
  abstract findById(id: AccountId): Promise<Account | null>

  /**
   * 根據 Username 查詢 Account
   */
  abstract findByUsername(username: string): Promise<Account | null>

  /**
   * 根據 Email 查詢 Account
   */
  abstract findByEmail(email: string): Promise<Account | null>

  /**
   * 根據 Player ID 查詢 Account
   */
  abstract findByPlayerId(playerId: PlayerId): Promise<Account | null>

  /**
   * 更新 Account
   */
  abstract update(account: Account): Promise<Account>

  /**
   * 刪除 Account
   */
  abstract delete(id: AccountId): Promise<void>
}
