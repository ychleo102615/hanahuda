/**
 * GetPlayerStatisticsUseCase Unit Tests
 *
 * @description
 * 測試取得玩家統計 Use Case 的業務邏輯。
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GetPlayerStatisticsUseCase } from '~~/server/leaderboard/application/use-cases/get-player-statistics-use-case'
import type { PlayerStatsRepositoryPort } from '~~/server/leaderboard/application/ports/output/player-stats-repository-port'
import type { PlayerStats } from '~~/server/leaderboard/domain/player-stats/player-stats'

describe('GetPlayerStatisticsUseCase', () => {
  let useCase: GetPlayerStatisticsUseCase
  let mockRepository: PlayerStatsRepositoryPort

  const testPlayerId = 'player-123'

  const mockPlayerStats: PlayerStats = {
    playerId: testPlayerId,
    totalScore: 100,
    gamesPlayed: 10,
    gamesWon: 7,
    gamesLost: 3,
    koiKoiCalls: 15,
    multiplierWins: 5,
    yakuCounts: { TANE: 3, GOKOU: 1 },
  }

  beforeEach(() => {
    mockRepository = {
      findByPlayerId: vi.fn().mockResolvedValue(mockPlayerStats),
      save: vi.fn(),
      deleteByPlayerId: vi.fn(),
    }

    useCase = new GetPlayerStatisticsUseCase(mockRepository)
  })

  describe('execute', () => {
    it('should return player statistics with calculated win rate', async () => {
      const result = await useCase.execute({
        playerId: testPlayerId,
        timeRange: 'all',
      })

      expect(mockRepository.findByPlayerId).toHaveBeenCalledWith(testPlayerId)
      expect(result.statistics.playerId).toBe(testPlayerId)
      expect(result.statistics.totalScore).toBe(100)
      expect(result.statistics.gamesPlayed).toBe(10)
      expect(result.statistics.gamesWon).toBe(7)
      expect(result.statistics.winRate).toBe(70)
      expect(result.timeRange).toBe('all')
    })

    it('should return empty statistics when player has no records', async () => {
      vi.mocked(mockRepository.findByPlayerId).mockResolvedValue(null)

      const result = await useCase.execute({
        playerId: 'new-player',
        timeRange: 'all',
      })

      expect(result.statistics.totalScore).toBe(0)
      expect(result.statistics.gamesPlayed).toBe(0)
      expect(result.statistics.winRate).toBe(0)
      expect(result.statistics.yakuCounts).toEqual({})
    })

    it('should use default timeRange "all" when not specified', async () => {
      const result = await useCase.execute({
        playerId: testPlayerId,
      })

      expect(result.timeRange).toBe('all')
    })

    it('should preserve yaku counts in statistics', async () => {
      const result = await useCase.execute({
        playerId: testPlayerId,
        timeRange: 'all',
      })

      expect(result.statistics.yakuCounts).toEqual({ TANE: 3, GOKOU: 1 })
    })
  })
})
