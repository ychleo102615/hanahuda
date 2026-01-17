/**
 * TimeRange - Value Object
 *
 * @description
 * 時間範圍的 Value Object。
 * 用於查詢指定時間範圍內的統計資料。
 *
 * @module server/leaderboard/domain/statistics/time-range
 */

/**
 * 時間範圍類型字面值
 */
export const TIME_RANGE_TYPES = {
  /** 全部時間 */
  ALL: 'all',
  /** 當日 */
  DAY: 'day',
  /** 本週 */
  WEEK: 'week',
  /** 本月 */
  MONTH: 'month',
} as const

/**
 * 時間範圍類型
 */
export type TimeRange = (typeof TIME_RANGE_TYPES)[keyof typeof TIME_RANGE_TYPES]

/**
 * 檢查是否為有效的時間範圍類型
 *
 * @param value - 待檢查的值
 * @returns 是否為有效的 TimeRange
 */
export function isValidTimeRange(value: unknown): value is TimeRange {
  return (
    typeof value === 'string' &&
    Object.values(TIME_RANGE_TYPES).includes(value as TimeRange)
  )
}

/**
 * 解析時間範圍字串
 *
 * @param value - 待解析的字串
 * @returns TimeRange（若有效）或 undefined（若無效）
 */
export function parseTimeRange(value: string): TimeRange | undefined {
  if (isValidTimeRange(value)) {
    return value
  }
  return undefined
}

/**
 * 取得時間範圍的起始日期
 *
 * @description
 * 根據指定的時間範圍類型，計算起始日期。
 * 使用 UTC+8 台灣時區，以確保日期計算一致性。
 *
 * @param timeRange - 時間範圍類型
 * @param now - 當前時間（預設為系統當前時間）
 * @returns 起始日期（若為 'all' 則返回 null）
 *
 * @example
 * ```typescript
 * // 假設當前時間為 2024-01-15 14:30:00 UTC+8
 * getTimeRangeStartDate('day')   // 2024-01-15 00:00:00 UTC+8
 * getTimeRangeStartDate('week')  // 2024-01-14 00:00:00 UTC+8 (週日)
 * getTimeRangeStartDate('month') // 2024-01-01 00:00:00 UTC+8
 * getTimeRangeStartDate('all')   // null
 * ```
 */
export function getTimeRangeStartDate(timeRange: TimeRange, now: Date = new Date()): Date | null {
  // UTC+8 offset in hours
  const UTC8_OFFSET_HOURS = 8

  // 建立 UTC+8 時區的日期表示
  // 取得 UTC 時間並加上 8 小時來得到 UTC+8 的日期
  const utc8Date = new Date(now.getTime() + UTC8_OFFSET_HOURS * 60 * 60 * 1000)

  switch (timeRange) {
    case 'all':
      return null

    case 'day': {
      // 當日 00:00:00 UTC+8
      const year = utc8Date.getUTCFullYear()
      const month = utc8Date.getUTCMonth()
      const day = utc8Date.getUTCDate()
      // 建立 UTC+8 的 00:00:00，然後轉回 UTC
      return new Date(Date.UTC(year, month, day, 0, 0, 0, 0) - UTC8_OFFSET_HOURS * 60 * 60 * 1000)
    }

    case 'week': {
      // 本週的週日 00:00:00 UTC+8
      const dayOfWeek = utc8Date.getUTCDay() // 0 = Sunday
      const year = utc8Date.getUTCFullYear()
      const month = utc8Date.getUTCMonth()
      const day = utc8Date.getUTCDate() - dayOfWeek
      // 建立 UTC+8 的 00:00:00，然後轉回 UTC
      return new Date(Date.UTC(year, month, day, 0, 0, 0, 0) - UTC8_OFFSET_HOURS * 60 * 60 * 1000)
    }

    case 'month': {
      // 本月 1 日 00:00:00 UTC+8
      const year = utc8Date.getUTCFullYear()
      const month = utc8Date.getUTCMonth()
      // 建立 UTC+8 的 00:00:00，然後轉回 UTC
      return new Date(Date.UTC(year, month, 1, 0, 0, 0, 0) - UTC8_OFFSET_HOURS * 60 * 60 * 1000)
    }

    default:
      // Exhaustive check
      const _exhaustiveCheck: never = timeRange
      return _exhaustiveCheck
  }
}

/**
 * 取得日期字串（YYYY-MM-DD 格式，UTC+8）
 *
 * @param date - 日期
 * @returns 日期字串
 */
export function getDateString(date: Date = new Date()): string {
  // UTC+8 offset in hours
  const UTC8_OFFSET_HOURS = 8

  // 建立 UTC+8 時區的日期表示
  const utc8Date = new Date(date.getTime() + UTC8_OFFSET_HOURS * 60 * 60 * 1000)

  const year = utc8Date.getUTCFullYear()
  const month = String(utc8Date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(utc8Date.getUTCDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}
