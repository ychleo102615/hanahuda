/**
 * Matchmaking Pool Aggregate Root
 *
 * @description
 * 配對佇列的 Aggregate Root。管理所有等待配對的玩家，依房間類型分組。
 * 這是純 Domain 物件，不包含任何持久化邏輯。
 *
 * 業務規則:
 * - 同一玩家同時只能有一個 active entry (跨所有房間類型)
 * - 條目按進入時間排序 (FIFO)
 * - 配對時只考慮相同房間類型的玩家
 *
 * @module server/matchmaking/domain/matchmakingPool
 */

import type { RoomTypeId } from '~~/shared/constants/roomTypes'
import { MatchmakingEntry, type MatchmakingEntryStatus } from './matchmakingEntry'

/**
 * Pool Statistics
 */
export interface PoolStatistics {
  readonly totalEntries: number
  readonly entriesByRoomType: Record<RoomTypeId, number>
  readonly entriesByStatus: Record<MatchmakingEntryStatus, number>
}

/**
 * Matchmaking Pool Aggregate Root
 *
 * @description
 * 管理配對佇列的 Aggregate Root。
 * 所有對佇列的操作都應透過此類別進行。
 */
export class MatchmakingPool {
  /**
   * 依房間類型分組的條目 Map
   * Key: RoomTypeId, Value: MatchmakingEntry[]
   */
  private readonly entriesByRoomType: Map<RoomTypeId, MatchmakingEntry[]>

  /**
   * 依玩家 ID 索引的條目 Map (用於快速查詢)
   */
  private readonly entriesByPlayerId: Map<string, MatchmakingEntry>

  constructor() {
    this.entriesByRoomType = new Map()
    this.entriesByPlayerId = new Map()
  }

  /**
   * 新增條目到佇列
   *
   * @throws 若玩家已在佇列中
   */
  add(entry: MatchmakingEntry): void {
    // 檢查玩家是否已在佇列中
    if (this.entriesByPlayerId.has(entry.playerId)) {
      throw new Error(`Player ${entry.playerId} is already in the matchmaking queue`)
    }

    // 依房間類型分組儲存
    const roomEntries = this.entriesByRoomType.get(entry.roomType) ?? []
    roomEntries.push(entry)
    this.entriesByRoomType.set(entry.roomType, roomEntries)

    // 建立玩家索引
    this.entriesByPlayerId.set(entry.playerId, entry)
  }

  /**
   * 從佇列移除條目
   *
   * @returns 被移除的條目，若不存在則為 undefined
   */
  remove(entryId: string): MatchmakingEntry | undefined {
    // 尋找條目
    for (const [roomType, entries] of this.entriesByRoomType) {
      const index = entries.findIndex((e) => e.id === entryId)
      if (index !== -1) {
        const removed = entries.splice(index, 1)[0]

        // 清空房間類型的條目列表 (如果已空)
        if (entries.length === 0) {
          this.entriesByRoomType.delete(roomType)
        }

        // 移除玩家索引（確保 removed 存在）
        if (removed) {
          this.entriesByPlayerId.delete(removed.playerId)
        }

        return removed
      }
    }
    return undefined
  }

  /**
   * 依玩家 ID 查詢條目
   */
  findByPlayerId(playerId: string): MatchmakingEntry | undefined {
    return this.entriesByPlayerId.get(playerId)
  }

  /**
   * 依條目 ID 查詢條目
   */
  findById(entryId: string): MatchmakingEntry | undefined {
    for (const entries of this.entriesByRoomType.values()) {
      const entry = entries.find((e) => e.id === entryId)
      if (entry) {
        return entry
      }
    }
    return undefined
  }

  /**
   * 尋找可配對的對手
   *
   * @description
   * 在相同房間類型中尋找第一個可配對的對手 (FIFO)。
   * 回傳的對手必須：
   * - 與指定條目在相同房間類型
   * - 狀態為可配對 (SEARCHING 或 LOW_AVAILABILITY)
   * - 不是指定條目本身
   *
   * @param forEntry 尋找對手的條目
   * @returns 可配對的對手條目，若無則為 undefined
   */
  findMatch(forEntry: MatchmakingEntry): MatchmakingEntry | undefined {
    const roomEntries = this.entriesByRoomType.get(forEntry.roomType)
    if (!roomEntries || roomEntries.length < 2) {
      return undefined
    }

    // 尋找第一個可配對且不是自己的條目 (FIFO)
    for (const entry of roomEntries) {
      if (entry.id !== forEntry.id && entry.isMatchable()) {
        return entry
      }
    }

    return undefined
  }

  /**
   * 取得指定房間類型的所有條目
   */
  getByRoomType(roomType: RoomTypeId): readonly MatchmakingEntry[] {
    return this.entriesByRoomType.get(roomType) ?? []
  }

  /**
   * 取得所有條目
   */
  getAll(): readonly MatchmakingEntry[] {
    const allEntries: MatchmakingEntry[] = []
    for (const entries of this.entriesByRoomType.values()) {
      allEntries.push(...entries)
    }
    return allEntries
  }

  /**
   * 取得所有可配對的條目
   */
  getMatchableEntries(): readonly MatchmakingEntry[] {
    return this.getAll().filter((entry) => entry.isMatchable())
  }

  /**
   * 更新條目狀態
   *
   * @throws 若條目不存在
   */
  updateStatus(entryId: string, status: MatchmakingEntryStatus): void {
    const entry = this.findById(entryId)
    if (!entry) {
      throw new Error(`Entry ${entryId} not found in matchmaking pool`)
    }

    switch (status) {
      case 'LOW_AVAILABILITY':
        entry.transitionToLowAvailability()
        break
      case 'MATCHED':
        entry.transitionToMatched()
        break
      case 'CANCELLED':
        entry.transitionToCancelled()
        break
      case 'EXPIRED':
        entry.transitionToExpired()
        break
      default:
        throw new Error(`Invalid status transition: ${status}`)
    }
  }

  /**
   * 檢查玩家是否在佇列中
   */
  hasPlayer(playerId: string): boolean {
    return this.entriesByPlayerId.has(playerId)
  }

  /**
   * 取得佇列統計資訊
   */
  getStatistics(): PoolStatistics {
    const entriesByRoomType: Record<RoomTypeId, number> = {
      QUICK: 0,
      STANDARD: 0,
      MARATHON: 0,
    }
    const entriesByStatus: Record<MatchmakingEntryStatus, number> = {
      SEARCHING: 0,
      LOW_AVAILABILITY: 0,
      MATCHED: 0,
      CANCELLED: 0,
      EXPIRED: 0,
    }

    let totalEntries = 0

    for (const [roomType, entries] of this.entriesByRoomType) {
      entriesByRoomType[roomType] = entries.length
      totalEntries += entries.length

      for (const entry of entries) {
        entriesByStatus[entry.status]++
      }
    }

    return {
      totalEntries,
      entriesByRoomType,
      entriesByStatus,
    }
  }

  /**
   * 清空佇列
   */
  clear(): void {
    this.entriesByRoomType.clear()
    this.entriesByPlayerId.clear()
  }

  /**
   * 取得佇列大小
   */
  get size(): number {
    return this.entriesByPlayerId.size
  }

  /**
   * 檢查佇列是否為空
   */
  get isEmpty(): boolean {
    return this.size === 0
  }
}
