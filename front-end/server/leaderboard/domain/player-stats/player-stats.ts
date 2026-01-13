/**
 * PlayerStats Entity
 *
 * @description
 * 玩家累計統計資料的 Entity。
 * 對應資料庫 player_stats 表。
 *
 * @module server/leaderboard/domain/player-stats/player-stats
 */

import type { YakuCounts } from '../types'

/**
 * 玩家累計統計資料
 */
export interface PlayerStats {
  /** 玩家 ID */
  readonly playerId: string
  /** 總分數 */
  readonly totalScore: number
  /** 遊戲總場數 */
  readonly gamesPlayed: number
  /** 獲勝場數 */
  readonly gamesWon: number
  /** 失敗場數 */
  readonly gamesLost: number
  /** Koi-Koi 宣告次數 */
  readonly koiKoiCalls: number
  /** 倍率獲勝次數 */
  readonly multiplierWins: number
  /** 各役種達成次數 */
  readonly yakuCounts: YakuCounts
}

/**
 * 玩家統計更新參數
 */
export interface PlayerStatsUpdateParams {
  /** 分數變化 */
  readonly scoreChange: number
  /** 是否獲勝 */
  readonly isWin: boolean
  /** 達成的役種列表 */
  readonly achievedYaku: readonly string[]
  /** Koi-Koi 宣告次數 */
  readonly koiKoiCalls: number
  /** 是否為倍率獲勝 */
  readonly isMultiplierWin: boolean
}

/**
 * 建立空的玩家統計
 *
 * @param playerId - 玩家 ID
 * @returns 初始化的 PlayerStats
 */
export function createEmptyPlayerStats(playerId: string): PlayerStats {
  return {
    playerId,
    totalScore: 0,
    gamesPlayed: 0,
    gamesWon: 0,
    gamesLost: 0,
    koiKoiCalls: 0,
    multiplierWins: 0,
    yakuCounts: {},
  }
}

/**
 * 更新玩家統計
 *
 * @param stats - 現有的玩家統計
 * @param params - 更新參數
 * @returns 更新後的 PlayerStats（不可變更新）
 */
export function updatePlayerStats(
  stats: PlayerStats,
  params: PlayerStatsUpdateParams
): PlayerStats {
  // 更新役種計數（建立可變副本後再轉為不可變）
  const mutableYakuCounts: Record<string, number> = { ...stats.yakuCounts }
  for (const yaku of params.achievedYaku) {
    mutableYakuCounts[yaku] = (mutableYakuCounts[yaku] || 0) + 1
  }
  const newYakuCounts: YakuCounts = mutableYakuCounts

  return {
    ...stats,
    totalScore: stats.totalScore + params.scoreChange,
    gamesPlayed: stats.gamesPlayed + 1,
    gamesWon: stats.gamesWon + (params.isWin ? 1 : 0),
    gamesLost: stats.gamesLost + (params.isWin ? 0 : 1),
    koiKoiCalls: stats.koiKoiCalls + params.koiKoiCalls,
    multiplierWins: stats.multiplierWins + (params.isMultiplierWin ? 1 : 0),
    yakuCounts: newYakuCounts,
  }
}
