/**
 * LeaderboardType - Value Object
 *
 * @description
 * 排行榜類型的 Value Object。
 * 定義支援的排行榜類型及其驗證邏輯。
 *
 * @module server/leaderboard/domain/leaderboard/leaderboard-type
 */

/**
 * 排行榜類型字面值
 */
export const LEADERBOARD_TYPES = {
  /** 日排行榜 */
  DAILY: 'daily',
  /** 週排行榜 */
  WEEKLY: 'weekly',
} as const

/**
 * 排行榜類型
 */
export type LeaderboardType = (typeof LEADERBOARD_TYPES)[keyof typeof LEADERBOARD_TYPES]

/**
 * 檢查是否為有效的排行榜類型
 *
 * @param value - 待檢查的值
 * @returns 是否為有效的 LeaderboardType
 */
export function isValidLeaderboardType(value: unknown): value is LeaderboardType {
  return (
    typeof value === 'string' &&
    Object.values(LEADERBOARD_TYPES).includes(value as LeaderboardType)
  )
}

/**
 * 解析排行榜類型字串
 *
 * @param value - 待解析的字串
 * @returns LeaderboardType（若有效）或 undefined（若無效）
 */
export function parseLeaderboardType(value: string): LeaderboardType | undefined {
  if (isValidLeaderboardType(value)) {
    return value
  }
  return undefined
}
