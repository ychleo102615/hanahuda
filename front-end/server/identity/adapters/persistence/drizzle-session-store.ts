/**
 * DrizzleSessionStore
 *
 * @description
 * Session Store 的 Drizzle ORM 實作。
 * 將 Session 持久化到 PostgreSQL。
 *
 * 參考: specs/010-player-account/plan.md - Adapter Layer
 */

import { eq, lt } from 'drizzle-orm'
import { SessionStorePort } from '../../application/ports/output/session-store-port'
import { sessions, type NewSession } from '~~/server/database/schema'
import { refreshSession, type Session, type SessionId } from '../../domain/types/session'
import type { PlayerId } from '../../domain/player/player'

/**
 * 將 Domain Session 轉換為資料庫記錄格式
 */
function toDbRecord(session: Session): NewSession {
  return {
    id: session.id,
    playerId: session.playerId,
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
    lastAccessedAt: session.lastAccessedAt,
  }
}

/**
 * 將資料庫記錄轉換為 Domain Session
 */
function toDomainSession(record: typeof sessions.$inferSelect): Session {
  return Object.freeze({
    id: record.id as SessionId,
    playerId: record.playerId as PlayerId,
    createdAt: record.createdAt,
    expiresAt: record.expiresAt,
    lastAccessedAt: record.lastAccessedAt,
  })
}

/**
 * Drizzle ORM 實作的 Session Store
 */
export class DrizzleSessionStore extends SessionStorePort {
  constructor(private readonly db: typeof import('~~/server/utils/db').db) {
    super()
  }

  async save(session: Session): Promise<Session> {
    const [inserted] = await this.db
      .insert(sessions)
      .values(toDbRecord(session))
      .returning()

    if (!inserted) {
      throw new Error('Failed to insert session')
    }

    return toDomainSession(inserted)
  }

  async findById(id: SessionId): Promise<Session | null> {
    const [record] = await this.db
      .select()
      .from(sessions)
      .where(eq(sessions.id, id))
      .limit(1)

    return record ? toDomainSession(record) : null
  }

  async delete(id: SessionId): Promise<void> {
    await this.db
      .delete(sessions)
      .where(eq(sessions.id, id))
  }

  async deleteByPlayerId(playerId: PlayerId): Promise<void> {
    await this.db
      .delete(sessions)
      .where(eq(sessions.playerId, playerId))
  }

  async refresh(session: Session): Promise<Session> {
    // 使用 domain 函數計算新的過期時間
    const refreshed = refreshSession(session)

    // 更新資料庫
    const [updated] = await this.db
      .update(sessions)
      .set({
        lastAccessedAt: refreshed.lastAccessedAt,
        expiresAt: refreshed.expiresAt,
      })
      .where(eq(sessions.id, session.id))
      .returning()

    if (!updated) {
      throw new Error('Failed to refresh session')
    }

    return toDomainSession(updated)
  }

  /**
   * 清除所有過期的 Sessions
   *
   * 可由排程任務定期呼叫
   */
  async cleanupExpired(): Promise<number> {
    const deleted = await this.db
      .delete(sessions)
      .where(lt(sessions.expiresAt, new Date()))
      .returning({ id: sessions.id })

    return deleted.length
  }
}
