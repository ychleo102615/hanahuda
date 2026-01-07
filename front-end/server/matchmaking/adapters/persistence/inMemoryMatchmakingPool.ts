/**
 * In-Memory Matchmaking Pool Adapter
 *
 * @description
 * MatchmakingPoolPort 的 In-Memory 實作。
 * MVP 階段使用，與現有 InMemoryGameStore 模式一致。
 *
 * @module server/matchmaking/adapters/persistence/inMemoryMatchmakingPool
 */

import type { RoomTypeId } from '~~/shared/constants/roomTypes'
import {
  MatchmakingPoolPort,
} from '../../application/ports/output/matchmakingPoolPort'
import {
  MatchmakingEntry,
  type MatchmakingEntryStatus,
} from '../../domain/matchmakingEntry'
import { MatchmakingPool } from '../../domain/matchmakingPool'

/**
 * In-Memory Matchmaking Pool Adapter
 *
 * @description
 * 使用 MatchmakingPool 領域物件實作持久化介面。
 */
export class InMemoryMatchmakingPool extends MatchmakingPoolPort {
  private readonly pool: MatchmakingPool

  constructor() {
    super()
    this.pool = new MatchmakingPool()
  }

  async add(entry: MatchmakingEntry): Promise<void> {
    this.pool.add(entry)
  }

  async remove(entryId: string): Promise<MatchmakingEntry | undefined> {
    return this.pool.remove(entryId)
  }

  async findByPlayerId(playerId: string): Promise<MatchmakingEntry | undefined> {
    return this.pool.findByPlayerId(playerId)
  }

  async findById(entryId: string): Promise<MatchmakingEntry | undefined> {
    return this.pool.findById(entryId)
  }

  async findMatch(forEntry: MatchmakingEntry): Promise<MatchmakingEntry | undefined> {
    return this.pool.findMatch(forEntry)
  }

  async getByRoomType(roomType: RoomTypeId): Promise<readonly MatchmakingEntry[]> {
    return this.pool.getByRoomType(roomType)
  }

  async updateStatus(entryId: string, status: MatchmakingEntryStatus): Promise<void> {
    this.pool.updateStatus(entryId, status)
  }

  async hasPlayer(playerId: string): Promise<boolean> {
    return this.pool.hasPlayer(playerId)
  }

  /**
   * 取得佇列大小 (用於測試/除錯)
   */
  get size(): number {
    return this.pool.size
  }

  /**
   * 清空佇列 (用於測試)
   */
  clear(): void {
    this.pool.clear()
  }
}

/**
 * 單例實例
 */
let instance: InMemoryMatchmakingPool | null = null

/**
 * 取得 InMemoryMatchmakingPool 單例
 */
export function getInMemoryMatchmakingPool(): InMemoryMatchmakingPool {
  if (!instance) {
    instance = new InMemoryMatchmakingPool()
  }
  return instance
}

/**
 * 重置單例 (用於測試)
 */
export function resetInMemoryMatchmakingPool(): void {
  if (instance) {
    instance.clear()
  }
  instance = null
}
