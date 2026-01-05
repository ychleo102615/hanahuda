/**
 * DrizzleOAuthLinkRepository
 *
 * @description
 * OAuthLink Repository 的 Drizzle ORM 實作。
 *
 * 參考: specs/010-player-account/plan.md - Adapter Layer
 */

import { eq, and } from 'drizzle-orm'
import { OAuthLinkRepositoryPort } from '../../application/ports/output/oauth-link-repository-port'
import { oauthLinks, type NewOAuthLink } from '~~/server/database/schema'
import type { OAuthLink, OAuthLinkId, OAuthProvider } from '../../domain/oauth-link/oauth-link'
import type { AccountId } from '../../domain/account/account'

/**
 * 將資料庫記錄轉換為 Domain OAuthLink
 */
function toDomainOAuthLink(record: typeof oauthLinks.$inferSelect): OAuthLink {
  return {
    id: record.id as OAuthLinkId,
    accountId: record.accountId as AccountId,
    provider: record.provider as OAuthProvider,
    providerUserId: record.providerUserId,
    providerEmail: record.providerEmail,
    createdAt: record.createdAt,
  }
}

/**
 * 將 Domain OAuthLink 轉換為資料庫記錄格式
 */
function toDbRecord(oauthLink: OAuthLink): NewOAuthLink {
  return {
    id: oauthLink.id,
    accountId: oauthLink.accountId,
    provider: oauthLink.provider,
    providerUserId: oauthLink.providerUserId,
    providerEmail: oauthLink.providerEmail,
    createdAt: oauthLink.createdAt,
  }
}

/**
 * Drizzle ORM 實作的 OAuthLink Repository
 */
export class DrizzleOAuthLinkRepository extends OAuthLinkRepositoryPort {
  constructor(private readonly db: typeof import('~~/server/utils/db').db) {
    super()
  }

  async save(oauthLink: OAuthLink): Promise<OAuthLink> {
    const [inserted] = await this.db
      .insert(oauthLinks)
      .values(toDbRecord(oauthLink))
      .returning()

    if (!inserted) {
      throw new Error('Failed to insert OAuth link')
    }

    return toDomainOAuthLink(inserted)
  }

  async findById(id: OAuthLinkId): Promise<OAuthLink | null> {
    const [record] = await this.db
      .select()
      .from(oauthLinks)
      .where(eq(oauthLinks.id, id))
      .limit(1)

    return record ? toDomainOAuthLink(record) : null
  }

  async findByProviderUserId(
    provider: OAuthProvider,
    providerUserId: string
  ): Promise<OAuthLink | null> {
    const [record] = await this.db
      .select()
      .from(oauthLinks)
      .where(
        and(
          eq(oauthLinks.provider, provider),
          eq(oauthLinks.providerUserId, providerUserId)
        )
      )
      .limit(1)

    return record ? toDomainOAuthLink(record) : null
  }

  async findByAccountId(accountId: AccountId): Promise<OAuthLink[]> {
    const records = await this.db
      .select()
      .from(oauthLinks)
      .where(eq(oauthLinks.accountId, accountId))

    return records.map(toDomainOAuthLink)
  }

  async delete(id: OAuthLinkId): Promise<void> {
    await this.db.delete(oauthLinks).where(eq(oauthLinks.id, id))
  }

  async deleteByAccountId(accountId: AccountId): Promise<void> {
    await this.db.delete(oauthLinks).where(eq(oauthLinks.accountId, accountId))
  }
}
