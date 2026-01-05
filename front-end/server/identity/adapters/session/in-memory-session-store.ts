/**
 * InMemorySessionStore
 *
 * @description
 * Session Store 的 In-Memory 實作。
 * MVP 階段使用，未來可替換為 DB-backed 或 Redis。
 *
 * 參考: specs/010-player-account/research.md - Session Store 實作方案
 */

import { SessionStorePort } from '../../application/ports/output/session-store-port'
import { refreshSession, type Session, type SessionId } from '../../domain/types/session'
import type { PlayerId } from '../../domain/player/player'

/**
 * In-Memory Session Store
 *
 * 使用 Map 儲存 Session，支援單實例場景。
 * 注意：重啟後 Session 會遺失，適用於 MVP 階段。
 */
export class InMemorySessionStore extends SessionStorePort {
  private readonly sessions = new Map<SessionId, Session>()

  async save(session: Session): Promise<Session> {
    this.sessions.set(session.id, session)
    return session
  }

  async findById(id: SessionId): Promise<Session | null> {
    return this.sessions.get(id) ?? null
  }

  async delete(id: SessionId): Promise<void> {
    this.sessions.delete(id)
  }

  async deleteByPlayerId(playerId: PlayerId): Promise<void> {
    for (const [id, session] of this.sessions.entries()) {
      if (session.playerId === playerId) {
        this.sessions.delete(id)
      }
    }
  }

  async refresh(session: Session): Promise<Session> {
    const refreshed = refreshSession(session)
    this.sessions.set(session.id, refreshed)
    return refreshed
  }

  /**
   * 清除所有過期的 Sessions
   *
   * 可由排程任務定期呼叫
   */
  async cleanupExpired(): Promise<number> {
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

  /**
   * 取得目前儲存的 Session 數量
   *
   * 用於監控與測試
   */
  get size(): number {
    return this.sessions.size
  }

  /**
   * 清除所有 Sessions
   *
   * 僅用於測試
   */
  clear(): void {
    this.sessions.clear()
  }
}

/**
 * 全域 Session Store 實例
 *
 * 確保整個應用程式使用同一個 Session Store
 */
let globalSessionStore: InMemorySessionStore | null = null

/**
 * 取得全域 Session Store
 */
export function getSessionStore(): InMemorySessionStore {
  if (!globalSessionStore) {
    globalSessionStore = new InMemorySessionStore()
  }
  return globalSessionStore
}
