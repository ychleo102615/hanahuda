/**
 * PlayerStatsRepositoryPort - Output Port
 *
 * @description
 * Leaderboard BC 的玩家統計儲存介面。
 * 由 Adapter Layer 實作，供 Application Layer 使用。
 *
 * @module server/leaderboard/application/ports/output/player-stats-repository-port
 */

import type { PlayerStats } from '~~/server/leaderboard/domain/player-stats/player-stats'

/**
 * 玩家統計儲存庫介面
 *
 * Application Layer 透過此介面與持久化層互動，
 * 不需要知道具體的實作細節（PostgreSQL、記憶體等）。
 */
export interface PlayerStatsRepositoryPort {
  /**
   * 依玩家 ID 取得統計資料
   *
   * @param playerId - 玩家 ID
   * @returns 玩家統計（若不存在則返回 null）
   */
  findByPlayerId(playerId: string): Promise<PlayerStats | null>

  /**
   * 儲存玩家統計（新增或更新）
   *
   * @param stats - 玩家統計
   */
  save(stats: PlayerStats): Promise<void>

  /**
   * 透過玩家 ID 刪除統計記錄
   *
   * 用於帳號刪除時清理相關資料。
   *
   * @param playerId - 玩家 ID
   */
  deleteByPlayerId(playerId: string): Promise<void>
}
