import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { CachingSessionStore } from '~~/server/identity/adapters/session/caching-session-store'
import type { SessionDbStore } from '~~/server/identity/adapters/session/internal/session-db-store'
import type { SessionMemoryStore } from '~~/server/identity/adapters/session/internal/session-memory-store'
import type { Session, SessionId } from '~~/server/identity/domain/types/session'
import type { PlayerId } from '~~/server/identity/domain/player/player'

const NOW = new Date('2026-01-02T12:00:00Z')
const FUTURE = new Date('2026-01-09T12:00:00Z')
const PAST = new Date('2026-01-01T12:00:00Z')

const SESSION_ID = 'sess-abc' as SessionId
const PLAYER_ID = 'player-xyz' as PlayerId

function makeSession(overrides?: Partial<Session>): Session {
  return Object.freeze({
    id: SESSION_ID,
    playerId: PLAYER_ID,
    createdAt: new Date('2026-01-02T00:00:00Z'),
    expiresAt: FUTURE,
    lastAccessedAt: NOW,
    ...overrides,
  })
}

describe('CachingSessionStore', () => {
  let store: CachingSessionStore
  let mockDb: { [K in keyof SessionDbStore]: ReturnType<typeof vi.fn> }
  let mockMemory: { [K in keyof SessionMemoryStore]: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)

    mockDb = {
      save: vi.fn(),
      findById: vi.fn(),
      delete: vi.fn(),
      deleteByPlayerId: vi.fn(),
      refresh: vi.fn(),
      cleanupExpired: vi.fn(),
    }

    mockMemory = {
      set: vi.fn(),
      get: vi.fn(),
      delete: vi.fn(),
      deleteByPlayerId: vi.fn(),
      cleanupExpired: vi.fn(),
      size: vi.fn(),
    }

    store = new CachingSessionStore(
      mockDb as unknown as SessionDbStore,
      mockMemory as unknown as SessionMemoryStore,
    )
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ---------------------------------------------------------------------------
  // findById
  // ---------------------------------------------------------------------------

  describe('findById', () => {
    it('memory hit 且未過期 → 直接回傳，不呼叫 DB', async () => {
      const session = makeSession()
      mockMemory.get.mockReturnValue(session)

      const result = await store.findById(SESSION_ID)

      expect(result).toBe(session)
      expect(mockDb.findById).not.toHaveBeenCalled()
    })

    it('memory hit 但已過期 → 清除 memory，fallback DB 並存入 memory', async () => {
      const expiredInMemory = makeSession({ expiresAt: PAST })
      const freshFromDb = makeSession()
      mockMemory.get.mockReturnValue(expiredInMemory)
      mockDb.findById.mockResolvedValue(freshFromDb)

      const result = await store.findById(SESSION_ID)

      expect(mockMemory.delete).toHaveBeenCalledWith(SESSION_ID)
      expect(mockDb.findById).toHaveBeenCalledWith(SESSION_ID)
      expect(mockMemory.set).toHaveBeenCalledWith(freshFromDb)
      expect(result).toBe(freshFromDb)
    })

    it('memory hit 但已過期，DB 也無資料 → 回傳 null', async () => {
      mockMemory.get.mockReturnValue(makeSession({ expiresAt: PAST }))
      mockDb.findById.mockResolvedValue(null)

      const result = await store.findById(SESSION_ID)

      expect(result).toBeNull()
      expect(mockMemory.set).not.toHaveBeenCalled()
    })

    it('memory miss，DB hit 且未過期 → 存入 memory 並回傳', async () => {
      const session = makeSession()
      mockMemory.get.mockReturnValue(undefined)
      mockDb.findById.mockResolvedValue(session)

      const result = await store.findById(SESSION_ID)

      expect(mockMemory.set).toHaveBeenCalledWith(session)
      expect(result).toBe(session)
    })

    it('memory miss，DB hit 但已過期 → 不存入 memory，回傳 null', async () => {
      mockMemory.get.mockReturnValue(undefined)
      mockDb.findById.mockResolvedValue(makeSession({ expiresAt: PAST }))

      const result = await store.findById(SESSION_ID)

      expect(mockMemory.set).not.toHaveBeenCalled()
      expect(result).toBeNull()
    })

    it('memory miss，DB 也無資料 → 回傳 null', async () => {
      mockMemory.get.mockReturnValue(undefined)
      mockDb.findById.mockResolvedValue(null)

      const result = await store.findById(SESSION_ID)

      expect(result).toBeNull()
    })
  })

  // ---------------------------------------------------------------------------
  // save
  // ---------------------------------------------------------------------------

  describe('save', () => {
    it('寫入 DB 後同步存入 memory，回傳 DB 回傳的 session', async () => {
      const input = makeSession()
      const saved = makeSession({ lastAccessedAt: new Date() })
      mockDb.save.mockResolvedValue(saved)

      const result = await store.save(input)

      expect(mockDb.save).toHaveBeenCalledWith(input)
      expect(mockMemory.set).toHaveBeenCalledWith(saved)
      expect(result).toBe(saved)
    })
  })

  // ---------------------------------------------------------------------------
  // delete
  // ---------------------------------------------------------------------------

  describe('delete', () => {
    it('從 DB 刪除後同步移除 memory', async () => {
      mockDb.delete.mockResolvedValue(undefined)

      await store.delete(SESSION_ID)

      expect(mockDb.delete).toHaveBeenCalledWith(SESSION_ID)
      expect(mockMemory.delete).toHaveBeenCalledWith(SESSION_ID)
    })
  })

  // ---------------------------------------------------------------------------
  // deleteByPlayerId
  // ---------------------------------------------------------------------------

  describe('deleteByPlayerId', () => {
    it('從 DB 刪除後同步移除 memory 中同一 playerId 的所有 session', async () => {
      mockDb.deleteByPlayerId.mockResolvedValue(undefined)

      await store.deleteByPlayerId(PLAYER_ID)

      expect(mockDb.deleteByPlayerId).toHaveBeenCalledWith(PLAYER_ID)
      expect(mockMemory.deleteByPlayerId).toHaveBeenCalledWith(PLAYER_ID)
    })
  })

  // ---------------------------------------------------------------------------
  // refresh
  // ---------------------------------------------------------------------------

  describe('refresh', () => {
    it('更新 DB 後同步替換 memory 中的副本，回傳更新後的 session', async () => {
      const original = makeSession()
      const refreshed = makeSession({ expiresAt: new Date('2026-01-16T12:00:00Z') })
      mockDb.refresh.mockResolvedValue(refreshed)

      const result = await store.refresh(original)

      expect(mockDb.refresh).toHaveBeenCalledWith(original)
      expect(mockMemory.set).toHaveBeenCalledWith(refreshed)
      expect(result).toBe(refreshed)
    })
  })

  // ---------------------------------------------------------------------------
  // cleanupExpired
  // ---------------------------------------------------------------------------

  describe('cleanupExpired', () => {
    it('清理 memory 與 DB，回傳總刪除數量', async () => {
      mockMemory.cleanupExpired.mockReturnValue(3)
      mockDb.cleanupExpired.mockResolvedValue(7)

      const result = await store.cleanupExpired()

      expect(mockMemory.cleanupExpired).toHaveBeenCalled()
      expect(mockDb.cleanupExpired).toHaveBeenCalled()
      expect(result).toBe(10)
    })

    it('兩層皆無過期 session 時回傳 0', async () => {
      mockMemory.cleanupExpired.mockReturnValue(0)
      mockDb.cleanupExpired.mockResolvedValue(0)

      const result = await store.cleanupExpired()

      expect(result).toBe(0)
    })
  })
})
