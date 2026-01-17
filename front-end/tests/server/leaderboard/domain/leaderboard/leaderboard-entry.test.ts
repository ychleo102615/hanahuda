/**
 * LeaderboardEntry Value Object Unit Tests
 *
 * @description
 * 測試 LeaderboardEntry 和 calculateRanks 的排名計算邏輯。
 */

import { describe, it, expect } from 'vitest'
import {
  createLeaderboardEntry,
  calculateRanks,
  type ScoreData,
} from '~~/server/leaderboard/domain/leaderboard/leaderboard-entry'

describe('LeaderboardEntry', () => {
  describe('createLeaderboardEntry', () => {
    it('should create a leaderboard entry with correct values', () => {
      const entry = createLeaderboardEntry({
        playerId: 'player-1',
        displayName: 'Player One',
        totalScore: 100,
        gamesPlayed: 10,
        gamesWon: 7,
        rank: 1,
      })

      expect(entry.playerId).toBe('player-1')
      expect(entry.displayName).toBe('Player One')
      expect(entry.totalScore).toBe(100)
      expect(entry.gamesPlayed).toBe(10)
      expect(entry.gamesWon).toBe(7)
      expect(entry.rank).toBe(1)
    })

    it('should handle zero values correctly', () => {
      const entry = createLeaderboardEntry({
        playerId: 'player-2',
        displayName: 'New Player',
        totalScore: 0,
        gamesPlayed: 0,
        gamesWon: 0,
        rank: 10,
      })

      expect(entry.totalScore).toBe(0)
      expect(entry.gamesPlayed).toBe(0)
      expect(entry.gamesWon).toBe(0)
    })

    it('should handle negative score', () => {
      const entry = createLeaderboardEntry({
        playerId: 'player-3',
        displayName: 'Unlucky Player',
        totalScore: -50,
        gamesPlayed: 5,
        gamesWon: 0,
        rank: 99,
      })

      expect(entry.totalScore).toBe(-50)
    })
  })

  describe('calculateRanks', () => {
    it('should assign ranks based on totalScore (descending)', () => {
      const scores: ScoreData[] = [
        { playerId: 'p1', displayName: 'A', totalScore: 50, gamesPlayed: 5, gamesWon: 3 },
        { playerId: 'p2', displayName: 'B', totalScore: 100, gamesPlayed: 10, gamesWon: 7 },
        { playerId: 'p3', displayName: 'C', totalScore: 75, gamesPlayed: 8, gamesWon: 5 },
      ]

      const ranked = calculateRanks(scores)

      expect(ranked[0].playerId).toBe('p2')
      expect(ranked[0].rank).toBe(1)
      expect(ranked[0].totalScore).toBe(100)

      expect(ranked[1].playerId).toBe('p3')
      expect(ranked[1].rank).toBe(2)
      expect(ranked[1].totalScore).toBe(75)

      expect(ranked[2].playerId).toBe('p1')
      expect(ranked[2].rank).toBe(3)
      expect(ranked[2].totalScore).toBe(50)
    })

    it('should handle tied scores with same rank', () => {
      const scores: ScoreData[] = [
        { playerId: 'p1', displayName: 'A', totalScore: 100, gamesPlayed: 10, gamesWon: 7 },
        { playerId: 'p2', displayName: 'B', totalScore: 100, gamesPlayed: 10, gamesWon: 6 },
        { playerId: 'p3', displayName: 'C', totalScore: 50, gamesPlayed: 5, gamesWon: 3 },
      ]

      const ranked = calculateRanks(scores)

      // Both p1 and p2 should have rank 1 (tied)
      expect(ranked[0].rank).toBe(1)
      expect(ranked[1].rank).toBe(1)
      // p3 should have rank 3 (skipping 2)
      expect(ranked[2].rank).toBe(3)
      expect(ranked[2].playerId).toBe('p3')
    })

    it('should handle multiple ties', () => {
      const scores: ScoreData[] = [
        { playerId: 'p1', displayName: 'A', totalScore: 100, gamesPlayed: 10, gamesWon: 7 },
        { playerId: 'p2', displayName: 'B', totalScore: 100, gamesPlayed: 10, gamesWon: 6 },
        { playerId: 'p3', displayName: 'C', totalScore: 100, gamesPlayed: 10, gamesWon: 5 },
        { playerId: 'p4', displayName: 'D', totalScore: 50, gamesPlayed: 5, gamesWon: 3 },
      ]

      const ranked = calculateRanks(scores)

      expect(ranked[0].rank).toBe(1)
      expect(ranked[1].rank).toBe(1)
      expect(ranked[2].rank).toBe(1)
      expect(ranked[3].rank).toBe(4) // Skips 2 and 3
    })

    it('should return empty array for empty input', () => {
      const ranked = calculateRanks([])

      expect(ranked).toEqual([])
    })

    it('should handle single entry', () => {
      const scores: ScoreData[] = [
        { playerId: 'p1', displayName: 'Solo', totalScore: 50, gamesPlayed: 5, gamesWon: 3 },
      ]

      const ranked = calculateRanks(scores)

      expect(ranked.length).toBe(1)
      expect(ranked[0].rank).toBe(1)
    })

    it('should preserve all player data', () => {
      const scores: ScoreData[] = [
        { playerId: 'p1', displayName: 'Player One', totalScore: 100, gamesPlayed: 15, gamesWon: 10 },
      ]

      const ranked = calculateRanks(scores)

      expect(ranked[0].playerId).toBe('p1')
      expect(ranked[0].displayName).toBe('Player One')
      expect(ranked[0].totalScore).toBe(100)
      expect(ranked[0].gamesPlayed).toBe(15)
      expect(ranked[0].gamesWon).toBe(10)
    })

    it('should handle negative scores correctly', () => {
      const scores: ScoreData[] = [
        { playerId: 'p1', displayName: 'A', totalScore: 50, gamesPlayed: 10, gamesWon: 6 },
        { playerId: 'p2', displayName: 'B', totalScore: -10, gamesPlayed: 5, gamesWon: 1 },
        { playerId: 'p3', displayName: 'C', totalScore: -50, gamesPlayed: 8, gamesWon: 0 },
      ]

      const ranked = calculateRanks(scores)

      expect(ranked[0].playerId).toBe('p1')
      expect(ranked[0].rank).toBe(1)

      expect(ranked[1].playerId).toBe('p2')
      expect(ranked[1].rank).toBe(2)

      expect(ranked[2].playerId).toBe('p3')
      expect(ranked[2].rank).toBe(3)
    })
  })

  describe('immutability', () => {
    it('should not mutate the input scores array', () => {
      const scores: ScoreData[] = [
        { playerId: 'p1', displayName: 'A', totalScore: 50, gamesPlayed: 5, gamesWon: 3 },
        { playerId: 'p2', displayName: 'B', totalScore: 100, gamesPlayed: 10, gamesWon: 7 },
      ]

      const originalOrder = [...scores]
      calculateRanks(scores)

      // Original array should be unchanged
      expect(scores[0].playerId).toBe(originalOrder[0].playerId)
      expect(scores[1].playerId).toBe(originalOrder[1].playerId)
    })
  })
})
