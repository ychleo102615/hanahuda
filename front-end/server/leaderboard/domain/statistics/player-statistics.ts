/**
 * PlayerStatistics Aggregate
 *
 * @description
 * 玩家統計的 Aggregate。
 * 組合 PlayerStats 資料並計算衍生欄位（如勝率）。
 *
 * @module server/leaderboard/domain/statistics/player-statistics
 */

import type { YakuCounts } from '../types'

/**
 * 玩家統計（含計算欄位）
 */
export interface PlayerStatistics {
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
  /** 勝率（百分比，保留一位小數） */
  readonly winRate: number
}

/**
 * 建立 PlayerStatistics 的輸入參數
 */
export interface CreatePlayerStatisticsParams {
  readonly playerId: string
  readonly totalScore: number
  readonly gamesPlayed: number
  readonly gamesWon: number
  readonly gamesLost: number
  readonly koiKoiCalls: number
  readonly multiplierWins: number
  readonly yakuCounts: YakuCounts
}

/**
 * 計算勝率
 *
 * @param gamesWon - 獲勝場數
 * @param gamesPlayed - 遊戲總場數
 * @returns 勝率（百分比，保留一位小數）
 */
export function calculateWinRate(gamesWon: number, gamesPlayed: number): number {
  if (gamesPlayed === 0) {
    return 0
  }
  const rate = (gamesWon / gamesPlayed) * 100
  return Math.round(rate * 10) / 10
}

/**
 * 建立玩家統計
 *
 * @param params - 建立參數
 * @returns PlayerStatistics
 */
export function createPlayerStatistics(params: CreatePlayerStatisticsParams): PlayerStatistics {
  return {
    playerId: params.playerId,
    totalScore: params.totalScore,
    gamesPlayed: params.gamesPlayed,
    gamesWon: params.gamesWon,
    gamesLost: params.gamesLost,
    koiKoiCalls: params.koiKoiCalls,
    multiplierWins: params.multiplierWins,
    yakuCounts: { ...params.yakuCounts },
    winRate: calculateWinRate(params.gamesWon, params.gamesPlayed),
  }
}

/**
 * 建立空的玩家統計
 *
 * @param playerId - 玩家 ID
 * @returns 空的 PlayerStatistics
 */
export function createEmptyStatistics(playerId: string): PlayerStatistics {
  return {
    playerId,
    totalScore: 0,
    gamesPlayed: 0,
    gamesWon: 0,
    gamesLost: 0,
    koiKoiCalls: 0,
    multiplierWins: 0,
    yakuCounts: {},
    winRate: 0,
  }
}
