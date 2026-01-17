/**
 * GetDailyLeaderboardUseCase Unit Tests
 *
 * @description
 * 測試取得日排行榜 Use Case 的業務邏輯。
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GetDailyLeaderboardUseCase } from '~~/server/leaderboard/application/use-cases/get-daily-leaderboard-use-case'
import type { DailyPlayerScoreRepositoryPort, LeaderboardRawData } from '~~/server/leaderboard/application/ports/output/daily-player-score-repository-port'

describe('GetDailyLeaderboardUseCase', () => {
  let useCase: GetDailyLeaderboardUseCase
  let mockRepository: DailyPlayerScoreRepositoryPort

  const mockLeaderboardData: LeaderboardRawData[] = [
    { playerId: 'p1', displayName: 'Player One', totalScore: 100, gamesPlayed: 10, gamesWon: 7 },
    { playerId: 'p2', displayName: 'Player Two', totalScore: 75, gamesPlayed: 8, gamesWon: 5 },
    { playerId: 'p3', displayName: 'Player Three', totalScore: 50, gamesPlayed: 5, gamesWon: 3 },
  ]

  beforeEach(() => {
    mockRepository = {
      findByPlayerAndDate: vi.fn(),
      save: vi.fn(),
      getLeaderboard: vi.fn().mockResolvedValue(mockLeaderboardData),
      getPlayerRank: vi.fn(),
      deleteByPlayerId: vi.fn(),
    }

    useCase = new GetDailyLeaderboardUseCase(mockRepository)
  })

  describe('execute', () => {
    it('should return daily leaderboard with ranks', async () => {
      const result = await useCase.execute({
        type: 'daily',
        limit: 10,
      })

      expect(mockRepository.getLeaderboard).toHaveBeenCalledWith('daily', 10)
      expect(result.type).toBe('daily')
      expect(result.entries).toHaveLength(3)
      expect(result.entries[0].rank).toBe(1)
      expect(result.entries[0].playerId).toBe('p1')
      expect(result.entries[1].rank).toBe(2)
      expect(result.entries[2].rank).toBe(3)
    })

    it('should handle tied scores with same rank', async () => {
      const tiedData: LeaderboardRawData[] = [
        { playerId: 'p1', displayName: 'A', totalScore: 100, gamesPlayed: 10, gamesWon: 7 },
        { playerId: 'p2', displayName: 'B', totalScore: 100, gamesPlayed: 10, gamesWon: 6 },
        { playerId: 'p3', displayName: 'C', totalScore: 50, gamesPlayed: 5, gamesWon: 3 },
      ]

      vi.mocked(mockRepository.getLeaderboard).mockResolvedValue(tiedData)

      const result = await useCase.execute({ type: 'daily', limit: 10 })

      expect(result.entries[0].rank).toBe(1)
      expect(result.entries[1].rank).toBe(1)
      expect(result.entries[2].rank).toBe(3)
    })

    it('should return empty entries for empty leaderboard', async () => {
      vi.mocked(mockRepository.getLeaderboard).mockResolvedValue([])

      const result = await useCase.execute({ type: 'daily', limit: 10 })

      expect(result.entries).toEqual([])
    })

    it('should include current player rank when provided and not in top N', async () => {
      vi.mocked(mockRepository.getPlayerRank).mockResolvedValue(15)

      const result = await useCase.execute({
        type: 'daily',
        limit: 10,
        currentPlayerId: 'p-outside-top',
      })

      expect(mockRepository.getPlayerRank).toHaveBeenCalledWith('p-outside-top', 'daily')
      expect(result.currentPlayerRank).toBe(15)
    })

    it('should not include current player rank when player is in top N', async () => {
      // Player is in top 3 (mockLeaderboardData has 3 entries, p1 is first)
      const result = await useCase.execute({
        type: 'daily',
        limit: 10,
        currentPlayerId: 'p1',
      })

      // Should not call getPlayerRank since player is already in entries
      expect(mockRepository.getPlayerRank).not.toHaveBeenCalled()
      expect(result.currentPlayerRank).toBeUndefined()
    })

    it('should not include current player rank when currentPlayerId not provided', async () => {
      const result = await useCase.execute({
        type: 'daily',
        limit: 10,
      })

      expect(mockRepository.getPlayerRank).not.toHaveBeenCalled()
      expect(result.currentPlayerRank).toBeUndefined()
    })

    it('should respect the limit parameter', async () => {
      await useCase.execute({ type: 'daily', limit: 5 })

      expect(mockRepository.getLeaderboard).toHaveBeenCalledWith('daily', 5)
    })
  })
})
