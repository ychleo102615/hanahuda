import type { Session, SessionId } from '../../../domain/types/session'
import type { PlayerId } from '../../../domain/player/player'

export class SessionMemoryStore {
  private readonly sessions = new Map<SessionId, Session>()

  set(session: Session): void {
    this.sessions.set(session.id, session)
  }

  get(id: SessionId): Session | undefined {
    return this.sessions.get(id)
  }

  delete(id: SessionId): void {
    this.sessions.delete(id)
  }

  deleteByPlayerId(playerId: PlayerId): void {
    for (const [id, session] of this.sessions.entries()) {
      if (session.playerId === playerId) {
        this.sessions.delete(id)
      }
    }
  }

  cleanupExpired(): number {
    const now = new Date()
    let count = 0

    for (const [id, session] of this.sessions.entries()) {
      if (session.expiresAt <= now) {
        this.sessions.delete(id)
        count++
      }
    }

    return count
  }

  get size(): number {
    return this.sessions.size
  }
}
