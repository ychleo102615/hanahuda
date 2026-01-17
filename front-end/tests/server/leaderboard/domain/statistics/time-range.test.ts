/**
 * TimeRange Value Object Unit Tests
 *
 * @description
 * 測試 TimeRange 的驗證和日期計算邏輯。
 */

import { describe, it, expect } from 'vitest'
import {
  TIME_RANGE_TYPES,
  isValidTimeRange,
  parseTimeRange,
  getTimeRangeStartDate,
  getDateString,
} from '~~/server/leaderboard/domain/statistics/time-range'

describe('TimeRange', () => {
  describe('TIME_RANGE_TYPES', () => {
    it('should have all expected types', () => {
      expect(TIME_RANGE_TYPES.ALL).toBe('all')
      expect(TIME_RANGE_TYPES.DAY).toBe('day')
      expect(TIME_RANGE_TYPES.WEEK).toBe('week')
      expect(TIME_RANGE_TYPES.MONTH).toBe('month')
    })
  })

  describe('isValidTimeRange', () => {
    it('should return true for valid time ranges', () => {
      expect(isValidTimeRange('all')).toBe(true)
      expect(isValidTimeRange('day')).toBe(true)
      expect(isValidTimeRange('week')).toBe(true)
      expect(isValidTimeRange('month')).toBe(true)
    })

    it('should return false for invalid time ranges', () => {
      expect(isValidTimeRange('year')).toBe(false)
      expect(isValidTimeRange('daily')).toBe(false)
      expect(isValidTimeRange('')).toBe(false)
      expect(isValidTimeRange(null)).toBe(false)
      expect(isValidTimeRange(undefined)).toBe(false)
      expect(isValidTimeRange(123)).toBe(false)
    })
  })

  describe('parseTimeRange', () => {
    it('should parse valid time ranges', () => {
      expect(parseTimeRange('all')).toBe('all')
      expect(parseTimeRange('day')).toBe('day')
      expect(parseTimeRange('week')).toBe('week')
      expect(parseTimeRange('month')).toBe('month')
    })

    it('should return undefined for invalid time ranges', () => {
      expect(parseTimeRange('year')).toBeUndefined()
      expect(parseTimeRange('invalid')).toBeUndefined()
      expect(parseTimeRange('')).toBeUndefined()
    })
  })

  describe('getTimeRangeStartDate', () => {
    // 使用固定時間進行測試: 2024-01-15 14:30:00 UTC+8 = 2024-01-15 06:30:00 UTC
    const testDate = new Date('2024-01-15T06:30:00.000Z')

    it('should return null for "all"', () => {
      const result = getTimeRangeStartDate('all', testDate)
      expect(result).toBeNull()
    })

    it('should return start of day for "day"', () => {
      const result = getTimeRangeStartDate('day', testDate)
      // 2024-01-15 00:00:00 UTC+8 = 2024-01-14 16:00:00 UTC
      expect(result).toEqual(new Date('2024-01-14T16:00:00.000Z'))
    })

    it('should return start of week (Sunday) for "week"', () => {
      // 2024-01-15 is Monday
      const result = getTimeRangeStartDate('week', testDate)
      // 2024-01-14 (Sunday) 00:00:00 UTC+8 = 2024-01-13 16:00:00 UTC
      expect(result).toEqual(new Date('2024-01-13T16:00:00.000Z'))
    })

    it('should return start of month for "month"', () => {
      const result = getTimeRangeStartDate('month', testDate)
      // 2024-01-01 00:00:00 UTC+8 = 2023-12-31 16:00:00 UTC
      expect(result).toEqual(new Date('2023-12-31T16:00:00.000Z'))
    })

    describe('edge cases', () => {
      it('should handle week boundary (Sunday)', () => {
        // 2024-01-14 is Sunday, 14:30:00 UTC+8 = 06:30:00 UTC
        const sundayDate = new Date('2024-01-14T06:30:00.000Z')
        const result = getTimeRangeStartDate('week', sundayDate)
        // Should return the same Sunday 00:00:00 UTC+8
        expect(result).toEqual(new Date('2024-01-13T16:00:00.000Z'))
      })

      it('should handle month boundary', () => {
        // 2024-01-01 14:30:00 UTC+8 = 06:30:00 UTC
        const firstDayDate = new Date('2024-01-01T06:30:00.000Z')
        const result = getTimeRangeStartDate('month', firstDayDate)
        // Should return the same day 00:00:00 UTC+8
        expect(result).toEqual(new Date('2023-12-31T16:00:00.000Z'))
      })

      it('should handle year boundary', () => {
        // 2024-01-01 00:30:00 UTC+8 = 2023-12-31 16:30:00 UTC
        const yearBoundaryDate = new Date('2023-12-31T16:30:00.000Z')
        const result = getTimeRangeStartDate('month', yearBoundaryDate)
        // Should return 2024-01-01 00:00:00 UTC+8
        expect(result).toEqual(new Date('2023-12-31T16:00:00.000Z'))
      })
    })
  })

  describe('getDateString', () => {
    it('should format date as YYYY-MM-DD in UTC+8', () => {
      // 2024-01-15 14:30:00 UTC+8 = 2024-01-15 06:30:00 UTC
      const testDate = new Date('2024-01-15T06:30:00.000Z')
      expect(getDateString(testDate)).toBe('2024-01-15')
    })

    it('should handle timezone edge case (late UTC = next day UTC+8)', () => {
      // 2024-01-15 23:00:00 UTC = 2024-01-16 07:00:00 UTC+8
      const lateUtcDate = new Date('2024-01-15T23:00:00.000Z')
      expect(getDateString(lateUtcDate)).toBe('2024-01-16')
    })

    it('should pad single digit months and days', () => {
      // 2024-05-03 08:00:00 UTC = 2024-05-03 16:00:00 UTC+8
      const singleDigitDate = new Date('2024-05-03T08:00:00.000Z')
      expect(getDateString(singleDigitDate)).toBe('2024-05-03')
    })
  })
})
