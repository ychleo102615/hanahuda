/**
 * PlayerStatsRepositoryPort - Output Port
 *
 * @description
 * Application Layer 定義的玩家統計儲存介面，由 Adapter Layer 實作。
 * 符合 Clean Architecture 的依賴反轉原則。
 *
 * @module server/application/ports/output/playerStatsRepositoryPort
 */

import type { PlayerStat } from '~~/server/database/schema/playerStats'

/**
 * 更新玩家統計的輸入資料
 *
 * 包含本場遊戲的增量數據，由 Repository 負責累加到現有統計。
 */
export interface UpsertPlayerStatsInput {
  /** 玩家 ID */
  readonly playerId: string

  /** 本場獲得/失去的分數 */
  readonly scoreChange: number

  /** 是否獲勝 */
  readonly isWinner: boolean

  /** 是否落敗 */
  readonly isLoser: boolean

  /** 本場達成的役種計數 (key: yaku_type, value: 達成次數) */
  readonly yakuCounts: Readonly<Record<string, number>>

  /** 本場 Koi-Koi 宣告次數 */
  readonly koiKoiCallCount: number

  /** 是否透過 Koi-Koi 倍率獲勝 (倍率 > 1) */
  readonly hadMultiplierWin: boolean

  /**
   * 是否僅記錄局結束統計（不更新遊戲勝負場次）
   *
   * - true: 只記錄役種/Koi-Koi/倍率，不更新 gamesPlayed/gamesWon/gamesLost/totalScore
   * - false/undefined: 完整記錄（遊戲結束時使用）
   */
  readonly isRoundEndOnly?: boolean
}

/**
 * 玩家統計儲存庫介面
 *
 * Application Layer 透過此介面與持久化層互動，
 * 不需要知道具體的實作細節（PostgreSQL、記憶體等）。
 */
export interface PlayerStatsRepositoryPort {
  /**
   * 透過玩家 ID 查找統計
   *
   * @param playerId - 玩家 ID
   * @returns 玩家統計（若存在）
   */
  findByPlayerId(playerId: string): Promise<PlayerStat | null>

  /**
   * 更新或建立玩家統計
   *
   * 若玩家不存在則建立新記錄，若存在則累加統計數據。
   * 此操作為原子性，確保併發安全。
   *
   * @param input - 本場遊戲的統計增量數據
   */
  upsert(input: UpsertPlayerStatsInput): Promise<void>
}
