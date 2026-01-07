/**
 * Matchmaking Pool Port
 *
 * @description
 * Application Layer 定義的配對佇列輸出介面。
 * 由 Adapter Layer 實作，提供配對佇列的持久化操作。
 *
 * @module server/matchmaking/application/ports/output/matchmakingPoolPort
 */

import type { RoomTypeId } from '~~/shared/constants/roomTypes'
import type { MatchmakingEntry, MatchmakingEntryStatus } from '../../../domain/matchmakingEntry'

/**
 * Matchmaking Pool Port
 *
 * @description
 * 配對佇列持久化介面。由 Adapter Layer 實作。
 */
export abstract class MatchmakingPoolPort {
  /**
   * 新增條目到佇列
   */
  abstract add(entry: MatchmakingEntry): Promise<void>

  /**
   * 從佇列移除條目
   */
  abstract remove(entryId: string): Promise<MatchmakingEntry | undefined>

  /**
   * 依玩家 ID 查詢條目
   */
  abstract findByPlayerId(playerId: string): Promise<MatchmakingEntry | undefined>

  /**
   * 依條目 ID 查詢條目
   */
  abstract findById(entryId: string): Promise<MatchmakingEntry | undefined>

  /**
   * 尋找可配對的對手
   */
  abstract findMatch(forEntry: MatchmakingEntry): Promise<MatchmakingEntry | undefined>

  /**
   * 取得指定房間類型的所有條目
   */
  abstract getByRoomType(roomType: RoomTypeId): Promise<readonly MatchmakingEntry[]>

  /**
   * 更新條目狀態
   */
  abstract updateStatus(entryId: string, status: MatchmakingEntryStatus): Promise<void>

  /**
   * 檢查玩家是否在佇列中
   */
  abstract hasPlayer(playerId: string): Promise<boolean>
}
