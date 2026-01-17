/**
 * DailyPlayerScore Entity Unit Tests
 *
 * @description
 * 測試 DailyPlayerScore Entity 的建立和更新邏輯。
 */

import { describe, it, expect } from 'vitest'
import {
  createDailyPlayerScore,
  updateDailyScore,
  type DailyPlayerScore,
} from '~~/server/leaderboard/domain/daily-score/daily-player-score'

describe('DailyPlayerScore', () => {
  const testDate = '2024-01-15'
  const testPlayerId = 'player-123'

  describe('createDailyPlayerScore', () => {
    it('should create a new DailyPlayerScore with initial values', () => {
      const score = createDailyPlayerScore(testPlayerId, testDate)

      expect(score.playerId).toBe(testPlayerId)
      expect(score.dateString).toBe(testDate)
      expect(score.totalScore).toBe(0)
      expect(score.gamesPlayed).toBe(0)
      expect(score.gamesWon).toBe(0)
    })

    it('should create score with specified date', () => {
      const score = createDailyPlayerScore(testPlayerId, '2024-02-20')

      expect(score.dateString).toBe('2024-02-20')
    })
  })

  describe('updateDailyScore', () => {
    it('should add score for a win', () => {
      const initial = createDailyPlayerScore(testPlayerId, testDate)

      const updated = updateDailyScore(initial, {
        scoreChange: 10,
        isWin: true,
      })

      expect(updated.totalScore).toBe(10)
      expect(updated.gamesPlayed).toBe(1)
      expect(updated.gamesWon).toBe(1)
    })

    it('should add score for a loss (no win increment)', () => {
      const initial = createDailyPlayerScore(testPlayerId, testDate)

      const updated = updateDailyScore(initial, {
        scoreChange: -5,
        isWin: false,
      })

      expect(updated.totalScore).toBe(-5)
      expect(updated.gamesPlayed).toBe(1)
      expect(updated.gamesWon).toBe(0)
    })

    it('should accumulate scores over multiple games', () => {
      const initial = createDailyPlayerScore(testPlayerId, testDate)

      const afterGame1 = updateDailyScore(initial, { scoreChange: 10, isWin: true })
      const afterGame2 = updateDailyScore(afterGame1, { scoreChange: -3, isWin: false })
      const afterGame3 = updateDailyScore(afterGame2, { scoreChange: 15, isWin: true })

      expect(afterGame3.totalScore).toBe(22) // 10 - 3 + 15
      expect(afterGame3.gamesPlayed).toBe(3)
      expect(afterGame3.gamesWon).toBe(2)
    })

    it('should preserve playerId and dateString when updating', () => {
      const initial = createDailyPlayerScore(testPlayerId, testDate)

      const updated = updateDailyScore(initial, { scoreChange: 5, isWin: true })

      expect(updated.playerId).toBe(testPlayerId)
      expect(updated.dateString).toBe(testDate)
    })

    it('should handle zero score change', () => {
      const initial = createDailyPlayerScore(testPlayerId, testDate)

      const updated = updateDailyScore(initial, { scoreChange: 0, isWin: false })

      expect(updated.totalScore).toBe(0)
      expect(updated.gamesPlayed).toBe(1)
      expect(updated.gamesWon).toBe(0)
    })

    it('should handle negative total score', () => {
      const initial = createDailyPlayerScore(testPlayerId, testDate)

      const afterLoss1 = updateDailyScore(initial, { scoreChange: -10, isWin: false })
      const afterLoss2 = updateDailyScore(afterLoss1, { scoreChange: -5, isWin: false })

      expect(afterLoss2.totalScore).toBe(-15)
      expect(afterLoss2.gamesPlayed).toBe(2)
      expect(afterLoss2.gamesWon).toBe(0)
    })
  })

  describe('immutability', () => {
    it('should not mutate the original score object', () => {
      const initial: DailyPlayerScore = {
        playerId: testPlayerId,
        dateString: testDate,
        totalScore: 5,
        gamesPlayed: 1,
        gamesWon: 1,
      }

      const updated = updateDailyScore(initial, { scoreChange: 10, isWin: true })

      // Original should be unchanged
      expect(initial.totalScore).toBe(5)
      expect(initial.gamesPlayed).toBe(1)
      expect(initial.gamesWon).toBe(1)

      // Updated should have new values
      expect(updated.totalScore).toBe(15)
      expect(updated.gamesPlayed).toBe(2)
      expect(updated.gamesWon).toBe(2)
    })
  })
})
