/**
 * LeaderboardEntry Value Object
 *
 * @description
 * 排行榜條目的 Value Object。
 * 包含玩家在排行榜上的完整資訊和排名。
 *
 * @module server/leaderboard/domain/leaderboard/leaderboard-entry
 */

/**
 * 排行榜條目
 */
export interface LeaderboardEntry {
  /** 玩家 ID */
  readonly playerId: string
  /** 顯示名稱 */
  readonly displayName: string
  /** 總積分 */
  readonly totalScore: number
  /** 遊玩場次 */
  readonly gamesPlayed: number
  /** 獲勝場次 */
  readonly gamesWon: number
  /** 排名 */
  readonly rank: number
}

/**
 * 積分資料（不含排名的原始資料）
 */
export interface ScoreData {
  /** 玩家 ID */
  readonly playerId: string
  /** 顯示名稱 */
  readonly displayName: string
  /** 總積分 */
  readonly totalScore: number
  /** 遊玩場次 */
  readonly gamesPlayed: number
  /** 獲勝場次 */
  readonly gamesWon: number
}

/**
 * 建立排行榜條目參數
 */
export interface CreateLeaderboardEntryParams {
  readonly playerId: string
  readonly displayName: string
  readonly totalScore: number
  readonly gamesPlayed: number
  readonly gamesWon: number
  readonly rank: number
}

/**
 * 建立排行榜條目
 *
 * @param params - 建立參數
 * @returns LeaderboardEntry
 */
export function createLeaderboardEntry(
  params: CreateLeaderboardEntryParams
): LeaderboardEntry {
  return {
    playerId: params.playerId,
    displayName: params.displayName,
    totalScore: params.totalScore,
    gamesPlayed: params.gamesPlayed,
    gamesWon: params.gamesWon,
    rank: params.rank,
  }
}

/**
 * 計算排名
 *
 * @description
 * 根據總積分計算排名。
 * 同分者共享排名，後續排名會跳過（如 1, 1, 3）。
 *
 * @param scores - 積分資料陣列
 * @returns 已排名的 LeaderboardEntry 陣列（按排名升序）
 */
export function calculateRanks(scores: ScoreData[]): LeaderboardEntry[] {
  if (scores.length === 0) {
    return []
  }

  // 建立副本並按總積分降序排序
  const sorted = [...scores].sort((a, b) => b.totalScore - a.totalScore)

  // 計算排名（考慮同分並列）
  const ranked: LeaderboardEntry[] = []
  let currentRank = 1

  for (let i = 0; i < sorted.length; i++) {
    const score = sorted[i]
    if (!score) {
      continue
    }

    const previousScore = sorted[i - 1]
    const previousEntry = ranked[i - 1]

    // 如果不是第一個且分數與前一個相同，使用相同排名
    if (i > 0 && previousScore && previousEntry && score.totalScore === previousScore.totalScore) {
      // 同分使用前一個的排名
      ranked.push(createLeaderboardEntry({
        playerId: score.playerId,
        displayName: score.displayName,
        totalScore: score.totalScore,
        gamesPlayed: score.gamesPlayed,
        gamesWon: score.gamesWon,
        rank: previousEntry.rank,
      }))
    }
    else {
      // 排名 = 當前位置 + 1
      ranked.push(createLeaderboardEntry({
        playerId: score.playerId,
        displayName: score.displayName,
        totalScore: score.totalScore,
        gamesPlayed: score.gamesPlayed,
        gamesWon: score.gamesWon,
        rank: currentRank,
      }))
    }

    currentRank++
  }

  return ranked
}
