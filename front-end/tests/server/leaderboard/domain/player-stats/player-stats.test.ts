/**
 * PlayerStats Entity Unit Tests
 *
 * @description
 * 測試 PlayerStats Entity 的建立和更新邏輯。
 */

import { describe, it, expect } from 'vitest'
import {
  createEmptyPlayerStats,
  updatePlayerStats,
  type PlayerStats,
  type PlayerStatsUpdateParams,
} from '~~/server/leaderboard/domain/player-stats/player-stats'

describe('PlayerStats', () => {
  const testPlayerId = 'player-123'

  describe('createEmptyPlayerStats', () => {
    it('should create empty stats with zero values', () => {
      const stats = createEmptyPlayerStats(testPlayerId)

      expect(stats.playerId).toBe(testPlayerId)
      expect(stats.totalScore).toBe(0)
      expect(stats.gamesPlayed).toBe(0)
      expect(stats.gamesWon).toBe(0)
      expect(stats.gamesLost).toBe(0)
      expect(stats.koiKoiCalls).toBe(0)
      expect(stats.multiplierWins).toBe(0)
      expect(stats.yakuCounts).toEqual({})
    })
  })

  describe('updatePlayerStats', () => {
    describe('win scenario', () => {
      it('should update all stats for a win', () => {
        const initial = createEmptyPlayerStats(testPlayerId)
        const params: PlayerStatsUpdateParams = {
          scoreChange: 15,
          isWin: true,
          achievedYaku: ['TANE', 'TANZAKU'],
          koiKoiCalls: 2,
          isMultiplierWin: true,
        }

        const updated = updatePlayerStats(initial, params)

        expect(updated.totalScore).toBe(15)
        expect(updated.gamesPlayed).toBe(1)
        expect(updated.gamesWon).toBe(1)
        expect(updated.gamesLost).toBe(0)
        expect(updated.koiKoiCalls).toBe(2)
        expect(updated.multiplierWins).toBe(1)
        expect(updated.yakuCounts).toEqual({ TANE: 1, TANZAKU: 1 })
      })

      it('should accumulate yaku counts across multiple games', () => {
        let stats = createEmptyPlayerStats(testPlayerId)

        stats = updatePlayerStats(stats, {
          scoreChange: 10,
          isWin: true,
          achievedYaku: ['TANE', 'TSUKIMI_ZAKE'],
          koiKoiCalls: 1,
          isMultiplierWin: false,
        })

        stats = updatePlayerStats(stats, {
          scoreChange: 5,
          isWin: true,
          achievedYaku: ['TANE', 'INOSHIKACHO'],
          koiKoiCalls: 0,
          isMultiplierWin: false,
        })

        expect(stats.yakuCounts).toEqual({
          TANE: 2,
          TSUKIMI_ZAKE: 1,
          INOSHIKACHO: 1,
        })
        expect(stats.gamesWon).toBe(2)
        expect(stats.koiKoiCalls).toBe(1)
      })
    })

    describe('loss scenario', () => {
      it('should update stats for a loss', () => {
        const initial = createEmptyPlayerStats(testPlayerId)
        const params: PlayerStatsUpdateParams = {
          scoreChange: -10,
          isWin: false,
          achievedYaku: [],
          koiKoiCalls: 0,
          isMultiplierWin: false,
        }

        const updated = updatePlayerStats(initial, params)

        expect(updated.totalScore).toBe(-10)
        expect(updated.gamesPlayed).toBe(1)
        expect(updated.gamesWon).toBe(0)
        expect(updated.gamesLost).toBe(1)
        expect(updated.koiKoiCalls).toBe(0)
        expect(updated.multiplierWins).toBe(0)
        expect(updated.yakuCounts).toEqual({})
      })
    })

    describe('accumulated stats', () => {
      it('should correctly accumulate over multiple games', () => {
        let stats = createEmptyPlayerStats(testPlayerId)

        // Game 1: Win
        stats = updatePlayerStats(stats, {
          scoreChange: 10,
          isWin: true,
          achievedYaku: ['TANE'],
          koiKoiCalls: 1,
          isMultiplierWin: true,
        })

        // Game 2: Loss
        stats = updatePlayerStats(stats, {
          scoreChange: -5,
          isWin: false,
          achievedYaku: [],
          koiKoiCalls: 0,
          isMultiplierWin: false,
        })

        // Game 3: Win
        stats = updatePlayerStats(stats, {
          scoreChange: 20,
          isWin: true,
          achievedYaku: ['GOKOU'],
          koiKoiCalls: 3,
          isMultiplierWin: true,
        })

        expect(stats.totalScore).toBe(25) // 10 - 5 + 20
        expect(stats.gamesPlayed).toBe(3)
        expect(stats.gamesWon).toBe(2)
        expect(stats.gamesLost).toBe(1)
        expect(stats.koiKoiCalls).toBe(4) // 1 + 0 + 3
        expect(stats.multiplierWins).toBe(2)
        expect(stats.yakuCounts).toEqual({ TANE: 1, GOKOU: 1 })
      })
    })

    describe('edge cases', () => {
      it('should handle empty yaku array', () => {
        const initial = createEmptyPlayerStats(testPlayerId)
        const updated = updatePlayerStats(initial, {
          scoreChange: 0,
          isWin: false,
          achievedYaku: [],
          koiKoiCalls: 0,
          isMultiplierWin: false,
        })

        expect(updated.yakuCounts).toEqual({})
      })

      it('should handle negative total score', () => {
        let stats = createEmptyPlayerStats(testPlayerId)

        stats = updatePlayerStats(stats, {
          scoreChange: -10,
          isWin: false,
          achievedYaku: [],
          koiKoiCalls: 0,
          isMultiplierWin: false,
        })

        stats = updatePlayerStats(stats, {
          scoreChange: -15,
          isWin: false,
          achievedYaku: [],
          koiKoiCalls: 0,
          isMultiplierWin: false,
        })

        expect(stats.totalScore).toBe(-25)
      })
    })
  })

  describe('immutability', () => {
    it('should not mutate the original stats object', () => {
      const initial: PlayerStats = {
        playerId: testPlayerId,
        totalScore: 10,
        gamesPlayed: 1,
        gamesWon: 1,
        gamesLost: 0,
        koiKoiCalls: 1,
        multiplierWins: 1,
        yakuCounts: { TANE: 1 },
      }

      const updated = updatePlayerStats(initial, {
        scoreChange: 5,
        isWin: true,
        achievedYaku: ['TANZAKU'],
        koiKoiCalls: 1,
        isMultiplierWin: false,
      })

      // Original should be unchanged
      expect(initial.totalScore).toBe(10)
      expect(initial.gamesPlayed).toBe(1)
      expect(initial.yakuCounts).toEqual({ TANE: 1 })

      // Updated should have new values
      expect(updated.totalScore).toBe(15)
      expect(updated.gamesPlayed).toBe(2)
      expect(updated.yakuCounts).toEqual({ TANE: 1, TANZAKU: 1 })
    })
  })
})
