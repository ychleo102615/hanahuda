import { SessionStorePort } from '../../application/ports/output/session-store-port'
import type { Session, SessionId } from '../../domain/types/session'
import type { PlayerId } from '../../domain/player/player'
import { SessionDbStore } from './internal/session-db-store'
import { SessionMemoryStore } from './internal/session-memory-store'

export class CachingSessionStore extends SessionStorePort {
  constructor(
    private readonly db: SessionDbStore,
    private readonly memory: SessionMemoryStore,
  ) {
    super()
  }

  async findById(id: SessionId): Promise<Session | null> {
    const now = new Date()
    const cached = this.memory.get(id)

    if (cached !== undefined) {
      if (cached.expiresAt > now) {
        return cached
      }
      // memory hit but expired — remove and fall through to DB
      this.memory.delete(id)
    }

    const session = await this.db.findById(id)
    if (!session) return null
    if (session.expiresAt <= now) return null

    this.memory.set(session)
    return session
  }

  async save(session: Session): Promise<Session> {
    const saved = await this.db.save(session)
    this.memory.set(saved)
    return saved
  }

  async delete(id: SessionId): Promise<void> {
    await this.db.delete(id)
    this.memory.delete(id)
  }

  async deleteByPlayerId(playerId: PlayerId): Promise<void> {
    await this.db.deleteByPlayerId(playerId)
    this.memory.deleteByPlayerId(playerId)
  }

  async refresh(session: Session): Promise<Session> {
    const refreshed = await this.db.refresh(session)
    this.memory.set(refreshed)
    return refreshed
  }

  async cleanupExpired(): Promise<number> {
    const memoryDeleted = this.memory.cleanupExpired()
    const dbDeleted = await this.db.cleanupExpired()
    return memoryDeleted + dbDeleted
  }
}
