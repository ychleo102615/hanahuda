import { eq, lt } from 'drizzle-orm'
import { sessions, type NewSession } from '~~/server/database/schema'
import { refreshSession, type Session, type SessionId } from '../../../domain/types/session'
import type { PlayerId } from '../../../domain/player/player'

function toDbRecord(session: Session): NewSession {
  return {
    id: session.id,
    playerId: session.playerId,
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
    lastAccessedAt: session.lastAccessedAt,
  }
}

function toDomainSession(record: typeof sessions.$inferSelect): Session {
  return Object.freeze({
    id: record.id as SessionId,
    playerId: record.playerId as PlayerId,
    createdAt: record.createdAt,
    expiresAt: record.expiresAt,
    lastAccessedAt: record.lastAccessedAt,
  })
}

export class SessionDbStore {
  constructor(private readonly db: typeof import('~~/server/utils/db').db) {}

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
    const refreshed = refreshSession(session)

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

  async cleanupExpired(): Promise<number> {
    const deleted = await this.db
      .delete(sessions)
      .where(lt(sessions.expiresAt, new Date()))
      .returning({ id: sessions.id })

    return deleted.length
  }
}
