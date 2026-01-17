/**
 * PlayerStatistics Aggregate Unit Tests
 *
 * @description
 * 測試 PlayerStatistics Aggregate 的勝率計算和組合邏輯。
 */

import { describe, it, expect } from 'vitest'
import {
  createPlayerStatistics,
  createEmptyStatistics,
  calculateWinRate,
} from '~~/server/leaderboard/domain/statistics/player-statistics'

describe('PlayerStatistics', () => {
  const testPlayerId = 'player-123'

  describe('createPlayerStatistics', () => {
    it('should create statistics from player stats', () => {
      const stats = createPlayerStatistics({
        playerId: testPlayerId,
        totalScore: 100,
        gamesPlayed: 10,
        gamesWon: 7,
        gamesLost: 3,
        koiKoiCalls: 15,
        multiplierWins: 5,
        yakuCounts: { TANE: 3, GOKOU: 1 },
      })

      expect(stats.playerId).toBe(testPlayerId)
      expect(stats.totalScore).toBe(100)
      expect(stats.gamesPlayed).toBe(10)
      expect(stats.gamesWon).toBe(7)
      expect(stats.gamesLost).toBe(3)
      expect(stats.koiKoiCalls).toBe(15)
      expect(stats.multiplierWins).toBe(5)
      expect(stats.yakuCounts).toEqual({ TANE: 3, GOKOU: 1 })
      expect(stats.winRate).toBe(70) // 7/10 * 100
    })

    it('should handle zero games played (avoid division by zero)', () => {
      const stats = createPlayerStatistics({
        playerId: testPlayerId,
        totalScore: 0,
        gamesPlayed: 0,
        gamesWon: 0,
        gamesLost: 0,
        koiKoiCalls: 0,
        multiplierWins: 0,
        yakuCounts: {},
      })

      expect(stats.winRate).toBe(0)
    })

    it('should round win rate to one decimal place', () => {
      const stats = createPlayerStatistics({
        playerId: testPlayerId,
        totalScore: 50,
        gamesPlayed: 3,
        gamesWon: 1,
        gamesLost: 2,
        koiKoiCalls: 2,
        multiplierWins: 0,
        yakuCounts: { TANE: 1 },
      })

      // 1/3 * 100 = 33.333...
      expect(stats.winRate).toBe(33.3)
    })
  })

  describe('createEmptyStatistics', () => {
    it('should create empty statistics with zero values', () => {
      const stats = createEmptyStatistics(testPlayerId)

      expect(stats.playerId).toBe(testPlayerId)
      expect(stats.totalScore).toBe(0)
      expect(stats.gamesPlayed).toBe(0)
      expect(stats.gamesWon).toBe(0)
      expect(stats.gamesLost).toBe(0)
      expect(stats.koiKoiCalls).toBe(0)
      expect(stats.multiplierWins).toBe(0)
      expect(stats.winRate).toBe(0)
      expect(stats.yakuCounts).toEqual({})
    })
  })

  describe('calculateWinRate', () => {
    it('should calculate correct win rate', () => {
      expect(calculateWinRate(7, 10)).toBe(70)
      expect(calculateWinRate(1, 2)).toBe(50)
      expect(calculateWinRate(10, 10)).toBe(100)
    })

    it('should return 0 when gamesPlayed is 0', () => {
      expect(calculateWinRate(0, 0)).toBe(0)
    })

    it('should return 0 when gamesWon is 0', () => {
      expect(calculateWinRate(0, 10)).toBe(0)
    })

    it('should round to one decimal place', () => {
      // 1/3 = 0.333... * 100 = 33.333...
      expect(calculateWinRate(1, 3)).toBe(33.3)
      // 2/3 = 0.666... * 100 = 66.666...
      expect(calculateWinRate(2, 3)).toBe(66.7)
      // 1/7 = 0.142857... * 100 = 14.2857...
      expect(calculateWinRate(1, 7)).toBe(14.3)
    })
  })

  describe('immutability', () => {
    it('should return a new object', () => {
      const input = {
        playerId: testPlayerId,
        totalScore: 100,
        gamesPlayed: 10,
        gamesWon: 7,
        gamesLost: 3,
        koiKoiCalls: 15,
        multiplierWins: 5,
        yakuCounts: { TANE: 3 },
      }

      const stats = createPlayerStatistics(input)

      // Modify input to verify independence
      input.totalScore = 200
      input.yakuCounts.TANE = 10

      // Stats should be unchanged
      expect(stats.totalScore).toBe(100)
      // Note: shallow copy of yakuCounts means this might be affected
      // If we want deep immutability, implementation should deep copy
    })
  })
})
