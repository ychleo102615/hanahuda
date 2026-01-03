/**
 * DrizzleAccountRepository
 *
 * @description
 * Account Repository 的 Drizzle ORM 實作。
 *
 * 參考: specs/010-player-account/plan.md - Adapter Layer
 */

import { eq } from 'drizzle-orm'
import { AccountRepositoryPort } from '../../application/ports/output/account-repository-port'
import { accounts, type NewAccount } from '~~/server/database/schema'
import type { Account, AccountId, PlayerId } from '../../domain/account/account'
import type { PasswordHash } from '../../domain/account/password-hash'

/**
 * 將資料庫記錄轉換為 Domain Account
 */
function toDomainAccount(record: typeof accounts.$inferSelect): Account {
  return {
    id: record.id as AccountId,
    playerId: record.playerId as PlayerId,
    username: record.username,
    email: record.email,
    passwordHash: {
      hash: record.passwordHash,
      algorithm: 'bcrypt',
    } as PasswordHash,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }
}

/**
 * 將 Domain Account 轉換為資料庫記錄格式
 */
function toDbRecord(account: Account): NewAccount {
  return {
    id: account.id,
    playerId: account.playerId,
    username: account.username,
    email: account.email,
    passwordHash: account.passwordHash.hash,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  }
}

/**
 * Drizzle ORM 實作的 Account Repository
 */
export class DrizzleAccountRepository extends AccountRepositoryPort {
  constructor(private readonly db: typeof import('~~/server/utils/db').db) {
    super()
  }

  async save(account: Account): Promise<Account> {
    const [inserted] = await this.db
      .insert(accounts)
      .values(toDbRecord(account))
      .returning()

    if (!inserted) {
      throw new Error('Failed to insert account')
    }

    return toDomainAccount(inserted)
  }

  async findById(id: AccountId): Promise<Account | null> {
    const [record] = await this.db
      .select()
      .from(accounts)
      .where(eq(accounts.id, id))
      .limit(1)

    return record ? toDomainAccount(record) : null
  }

  async findByUsername(username: string): Promise<Account | null> {
    const [record] = await this.db
      .select()
      .from(accounts)
      .where(eq(accounts.username, username))
      .limit(1)

    return record ? toDomainAccount(record) : null
  }

  async findByEmail(email: string): Promise<Account | null> {
    const [record] = await this.db
      .select()
      .from(accounts)
      .where(eq(accounts.email, email))
      .limit(1)

    return record ? toDomainAccount(record) : null
  }

  async findByPlayerId(playerId: PlayerId): Promise<Account | null> {
    const [record] = await this.db
      .select()
      .from(accounts)
      .where(eq(accounts.playerId, playerId))
      .limit(1)

    return record ? toDomainAccount(record) : null
  }

  async update(account: Account): Promise<Account> {
    const [updated] = await this.db
      .update(accounts)
      .set({
        username: account.username,
        email: account.email,
        passwordHash: account.passwordHash.hash,
        updatedAt: account.updatedAt,
      })
      .where(eq(accounts.id, account.id))
      .returning()

    if (!updated) {
      throw new Error('Failed to update account')
    }

    return toDomainAccount(updated)
  }

  async delete(id: AccountId): Promise<void> {
    await this.db.delete(accounts).where(eq(accounts.id, id))
  }
}
