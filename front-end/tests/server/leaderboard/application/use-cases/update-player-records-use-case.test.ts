/**
 * UpdatePlayerRecordsUseCase Unit Tests
 *
 * @description
 * 測試更新玩家記錄 Use Case 的業務邏輯。
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UpdatePlayerRecordsUseCase } from '~~/server/leaderboard/application/use-cases/update-player-records-use-case'
import type { PlayerStatsRepositoryPort } from '~~/server/leaderboard/application/ports/output/player-stats-repository-port'
import type { DailyPlayerScoreRepositoryPort } from '~~/server/leaderboard/application/ports/output/daily-player-score-repository-port'
import type { PlayerStats } from '~~/server/leaderboard/domain/player-stats/player-stats'
import type { DailyPlayerScore } from '~~/server/leaderboard/domain/daily-score/daily-player-score'

describe('UpdatePlayerRecordsUseCase', () => {
  let useCase: UpdatePlayerRecordsUseCase
  let mockPlayerStatsRepo: PlayerStatsRepositoryPort
  let mockDailyScoreRepo: DailyPlayerScoreRepositoryPort

  const winnerPlayerId = 'winner-123'
  const loserPlayerId = 'loser-456'
  const aiPlayerId = 'ai-789'

  beforeEach(() => {
    mockPlayerStatsRepo = {
      findByPlayerId: vi.fn().mockResolvedValue(null),
      save: vi.fn(),
      deleteByPlayerId: vi.fn(),
    }

    mockDailyScoreRepo = {
      findByPlayerAndDate: vi.fn().mockResolvedValue(null),
      save: vi.fn(),
      getLeaderboard: vi.fn(),
      getPlayerRank: vi.fn(),
      deleteByPlayerId: vi.fn(),
    }

    useCase = new UpdatePlayerRecordsUseCase(mockPlayerStatsRepo, mockDailyScoreRepo)
  })

  describe('execute', () => {
    it('should update player stats and daily scores for non-AI players', async () => {
      await useCase.execute({
        gameId: 'game-1',
        winnerId: winnerPlayerId,
        finalScores: [
          { playerId: winnerPlayerId, score: 15, achievedYaku: ['TANE', 'TANZAKU'], koiKoiCalls: 2, isMultiplierWin: true },
          { playerId: loserPlayerId, score: -15, achievedYaku: [], koiKoiCalls: 0, isMultiplierWin: false },
        ],
        players: [
          { id: winnerPlayerId, isAi: false },
          { id: loserPlayerId, isAi: false },
        ],
        finishedAt: new Date('2024-01-15T10:00:00Z'),
      })

      // Should save both player stats and daily scores for both players
      expect(mockPlayerStatsRepo.save).toHaveBeenCalledTimes(2)
      expect(mockDailyScoreRepo.save).toHaveBeenCalledTimes(2)
    })

    it('should skip AI players', async () => {
      await useCase.execute({
        gameId: 'game-1',
        winnerId: aiPlayerId,
        finalScores: [
          { playerId: aiPlayerId, score: 15, achievedYaku: ['GOKOU'], koiKoiCalls: 3, isMultiplierWin: true },
          { playerId: loserPlayerId, score: -15, achievedYaku: [], koiKoiCalls: 0, isMultiplierWin: false },
        ],
        players: [
          { id: aiPlayerId, isAi: true },
          { id: loserPlayerId, isAi: false },
        ],
        finishedAt: new Date('2024-01-15T10:00:00Z'),
      })

      // Should only save for the non-AI player
      expect(mockPlayerStatsRepo.save).toHaveBeenCalledTimes(1)
      expect(mockDailyScoreRepo.save).toHaveBeenCalledTimes(1)
    })

    it('should update existing player stats when found', async () => {
      const existingStats: PlayerStats = {
        playerId: winnerPlayerId,
        totalScore: 50,
        gamesPlayed: 5,
        gamesWon: 3,
        gamesLost: 2,
        koiKoiCalls: 5,
        multiplierWins: 2,
        yakuCounts: { TANE: 2 },
      }

      vi.mocked(mockPlayerStatsRepo.findByPlayerId).mockResolvedValue(existingStats)

      await useCase.execute({
        gameId: 'game-1',
        winnerId: winnerPlayerId,
        finalScores: [
          { playerId: winnerPlayerId, score: 10, achievedYaku: ['TANE'], koiKoiCalls: 1, isMultiplierWin: false },
        ],
        players: [{ id: winnerPlayerId, isAi: false }],
        finishedAt: new Date('2024-01-15T10:00:00Z'),
      })

      expect(mockPlayerStatsRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          totalScore: 60, // 50 + 10
          gamesPlayed: 6, // 5 + 1
          gamesWon: 4, // 3 + 1
          yakuCounts: { TANE: 3 }, // 2 + 1
        })
      )
    })

    it('should create new player stats when not found', async () => {
      vi.mocked(mockPlayerStatsRepo.findByPlayerId).mockResolvedValue(null)

      await useCase.execute({
        gameId: 'game-1',
        winnerId: winnerPlayerId,
        finalScores: [
          { playerId: winnerPlayerId, score: 10, achievedYaku: ['TANE'], koiKoiCalls: 1, isMultiplierWin: false },
        ],
        players: [{ id: winnerPlayerId, isAi: false }],
        finishedAt: new Date('2024-01-15T10:00:00Z'),
      })

      expect(mockPlayerStatsRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          playerId: winnerPlayerId,
          totalScore: 10,
          gamesPlayed: 1,
          gamesWon: 1,
        })
      )
    })

    it('should update existing daily score when found', async () => {
      const existingDailyScore: DailyPlayerScore = {
        playerId: winnerPlayerId,
        dateString: '2024-01-15',
        totalScore: 20,
        gamesPlayed: 2,
        gamesWon: 1,
      }

      vi.mocked(mockDailyScoreRepo.findByPlayerAndDate).mockResolvedValue(existingDailyScore)

      await useCase.execute({
        gameId: 'game-1',
        winnerId: winnerPlayerId,
        finalScores: [
          { playerId: winnerPlayerId, score: 10, achievedYaku: ['TANE'], koiKoiCalls: 1, isMultiplierWin: false },
        ],
        players: [{ id: winnerPlayerId, isAi: false }],
        finishedAt: new Date('2024-01-15T10:00:00Z'),
      })

      expect(mockDailyScoreRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          totalScore: 30, // 20 + 10
          gamesPlayed: 3, // 2 + 1
          gamesWon: 2, // 1 + 1
        })
      )
    })

    it('should handle draw game (no winner)', async () => {
      await useCase.execute({
        gameId: 'game-1',
        winnerId: null,
        finalScores: [
          { playerId: winnerPlayerId, score: 0, achievedYaku: [], koiKoiCalls: 0, isMultiplierWin: false },
          { playerId: loserPlayerId, score: 0, achievedYaku: [], koiKoiCalls: 0, isMultiplierWin: false },
        ],
        players: [
          { id: winnerPlayerId, isAi: false },
          { id: loserPlayerId, isAi: false },
        ],
        finishedAt: new Date('2024-01-15T10:00:00Z'),
      })

      // Both players should have loss recorded (no winner)
      expect(mockPlayerStatsRepo.save).toHaveBeenCalledTimes(2)
    })
  })
})
