/**
 * GetWeeklyLeaderboardUseCase Unit Tests
 *
 * @description
 * 測試取得週排行榜 Use Case 的業務邏輯。
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GetWeeklyLeaderboardUseCase } from '~~/server/leaderboard/application/use-cases/get-weekly-leaderboard-use-case'
import type { DailyPlayerScoreRepositoryPort, LeaderboardRawData } from '~~/server/leaderboard/application/ports/output/daily-player-score-repository-port'

describe('GetWeeklyLeaderboardUseCase', () => {
  let useCase: GetWeeklyLeaderboardUseCase
  let mockRepository: DailyPlayerScoreRepositoryPort

  const mockLeaderboardData: LeaderboardRawData[] = [
    { playerId: 'p1', displayName: 'Weekly Leader', totalScore: 500, gamesPlayed: 50, gamesWon: 35 },
    { playerId: 'p2', displayName: 'Runner Up', totalScore: 400, gamesPlayed: 45, gamesWon: 28 },
    { playerId: 'p3', displayName: 'Third Place', totalScore: 300, gamesPlayed: 40, gamesWon: 20 },
  ]

  beforeEach(() => {
    mockRepository = {
      findByPlayerAndDate: vi.fn(),
      save: vi.fn(),
      getLeaderboard: vi.fn().mockResolvedValue(mockLeaderboardData),
      getPlayerRank: vi.fn(),
      deleteByPlayerId: vi.fn(),
    }

    useCase = new GetWeeklyLeaderboardUseCase(mockRepository)
  })

  describe('execute', () => {
    it('should return weekly leaderboard with ranks', async () => {
      const result = await useCase.execute({
        type: 'weekly',
        limit: 10,
      })

      expect(mockRepository.getLeaderboard).toHaveBeenCalledWith('weekly', 10)
      expect(result.type).toBe('weekly')
      expect(result.entries).toHaveLength(3)
      expect(result.entries[0].rank).toBe(1)
      expect(result.entries[0].displayName).toBe('Weekly Leader')
      expect(result.entries[0].totalScore).toBe(500)
    })

    it('should aggregate scores from the entire week', async () => {
      // Weekly leaderboard should use 'weekly' type
      await useCase.execute({ type: 'weekly', limit: 20 })

      expect(mockRepository.getLeaderboard).toHaveBeenCalledWith('weekly', 20)
    })

    it('should handle tied weekly scores with same rank', async () => {
      const tiedData: LeaderboardRawData[] = [
        { playerId: 'p1', displayName: 'A', totalScore: 500, gamesPlayed: 50, gamesWon: 35 },
        { playerId: 'p2', displayName: 'B', totalScore: 500, gamesPlayed: 48, gamesWon: 30 },
        { playerId: 'p3', displayName: 'C', totalScore: 300, gamesPlayed: 40, gamesWon: 20 },
      ]

      vi.mocked(mockRepository.getLeaderboard).mockResolvedValue(tiedData)

      const result = await useCase.execute({ type: 'weekly', limit: 10 })

      expect(result.entries[0].rank).toBe(1)
      expect(result.entries[1].rank).toBe(1)
      expect(result.entries[2].rank).toBe(3)
    })

    it('should return empty entries for empty weekly leaderboard', async () => {
      vi.mocked(mockRepository.getLeaderboard).mockResolvedValue([])

      const result = await useCase.execute({ type: 'weekly', limit: 10 })

      expect(result.entries).toEqual([])
    })

    it('should include current player rank when not in top N', async () => {
      vi.mocked(mockRepository.getPlayerRank).mockResolvedValue(25)

      const result = await useCase.execute({
        type: 'weekly',
        limit: 10,
        currentPlayerId: 'p-outside-weekly-top',
      })

      expect(mockRepository.getPlayerRank).toHaveBeenCalledWith('p-outside-weekly-top', 'weekly')
      expect(result.currentPlayerRank).toBe(25)
    })

    it('should not fetch rank when player is already in entries', async () => {
      const result = await useCase.execute({
        type: 'weekly',
        limit: 10,
        currentPlayerId: 'p1', // p1 is in mockLeaderboardData
      })

      expect(mockRepository.getPlayerRank).not.toHaveBeenCalled()
      expect(result.currentPlayerRank).toBeUndefined()
    })

    it('should not include rank when currentPlayerId is not provided', async () => {
      const result = await useCase.execute({
        type: 'weekly',
        limit: 10,
      })

      expect(mockRepository.getPlayerRank).not.toHaveBeenCalled()
      expect(result.currentPlayerRank).toBeUndefined()
    })

    it('should handle player rank as null (not in leaderboard)', async () => {
      vi.mocked(mockRepository.getPlayerRank).mockResolvedValue(null)

      const result = await useCase.execute({
        type: 'weekly',
        limit: 10,
        currentPlayerId: 'p-never-played',
      })

      expect(result.currentPlayerRank).toBeUndefined()
    })
  })
})
