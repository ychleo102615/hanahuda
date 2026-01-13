/**
 * DailyPlayerScore Entity
 *
 * @description
 * 玩家每日積分的 Entity。
 * 記錄單一玩家在特定日期的遊戲成績。
 *
 * @module server/leaderboard/domain/daily-score/daily-player-score
 */

/**
 * 每日玩家積分
 */
export interface DailyPlayerScore {
  /** 玩家 ID */
  readonly playerId: string
  /** 日期字串 (YYYY-MM-DD) */
  readonly dateString: string
  /** 總積分 */
  readonly totalScore: number
  /** 遊玩場次 */
  readonly gamesPlayed: number
  /** 獲勝場次 */
  readonly gamesWon: number
}

/**
 * 積分更新參數
 */
export interface ScoreUpdateParams {
  /** 分數變化 */
  readonly scoreChange: number
  /** 是否獲勝 */
  readonly isWin: boolean
}

/**
 * 建立新的每日玩家積分
 *
 * @param playerId - 玩家 ID
 * @param dateString - 日期字串 (YYYY-MM-DD)
 * @returns 初始化的 DailyPlayerScore
 */
export function createDailyPlayerScore(
  playerId: string,
  dateString: string
): DailyPlayerScore {
  return {
    playerId,
    dateString,
    totalScore: 0,
    gamesPlayed: 0,
    gamesWon: 0,
  }
}

/**
 * 更新每日積分
 *
 * @param score - 現有的每日積分
 * @param params - 更新參數
 * @returns 更新後的 DailyPlayerScore（不可變更新）
 */
export function updateDailyScore(
  score: DailyPlayerScore,
  params: ScoreUpdateParams
): DailyPlayerScore {
  return {
    ...score,
    totalScore: score.totalScore + params.scoreChange,
    gamesPlayed: score.gamesPlayed + 1,
    gamesWon: score.gamesWon + (params.isWin ? 1 : 0),
  }
}
