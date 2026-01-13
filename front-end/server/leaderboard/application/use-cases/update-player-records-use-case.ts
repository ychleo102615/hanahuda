/**
 * UpdatePlayerRecordsUseCase
 *
 * @description
 * 更新玩家記錄的 Use Case。
 * 統一處理 player_stats 和 daily_player_scores 的更新。
 *
 * @module server/leaderboard/application/use-cases/update-player-records-use-case
 */

import type {
  UpdatePlayerRecordsInputPort,
  UpdatePlayerRecordsRequest,
} from '../ports/input/update-player-records-input-port'
import type { PlayerStatsRepositoryPort } from '../ports/output/player-stats-repository-port'
import type { DailyPlayerScoreRepositoryPort } from '../ports/output/daily-player-score-repository-port'
import {
  createEmptyPlayerStats,
  updatePlayerStats,
} from '~~/server/leaderboard/domain/player-stats/player-stats'
import {
  createDailyPlayerScore,
  updateDailyScore,
} from '~~/server/leaderboard/domain/daily-score/daily-player-score'
import { getDateString } from '~~/server/leaderboard/domain/statistics/time-range'

/**
 * 更新玩家記錄 Use Case
 */
export class UpdatePlayerRecordsUseCase implements UpdatePlayerRecordsInputPort {
  constructor(
    private readonly playerStatsRepository: PlayerStatsRepositoryPort,
    private readonly dailyScoreRepository: DailyPlayerScoreRepositoryPort
  ) {}

  /**
   * 執行更新玩家記錄
   *
   * @param request - 請求參數
   */
  async execute(request: UpdatePlayerRecordsRequest): Promise<void> {
    const dateString = getDateString(request.finishedAt)

    // 處理每位非 AI 玩家
    for (const scoreData of request.finalScores) {
      // 檢查是否為 AI
      const player = request.players.find(p => p.id === scoreData.playerId)
      if (!player || player.isAi) {
        continue
      }

      const isWin = scoreData.playerId === request.winnerId

      // 更新 player_stats
      await this.updatePlayerStats(scoreData.playerId, {
        scoreChange: scoreData.score,
        isWin,
        achievedYaku: scoreData.achievedYaku,
        koiKoiCalls: scoreData.koiKoiCalls,
        isMultiplierWin: scoreData.isMultiplierWin,
      })

      // 更新 daily_player_scores
      await this.updateDailyScore(scoreData.playerId, dateString, {
        scoreChange: scoreData.score,
        isWin,
      })
    }
  }

  /**
   * 更新玩家累計統計
   */
  private async updatePlayerStats(
    playerId: string,
    params: {
      scoreChange: number
      isWin: boolean
      achievedYaku: readonly string[]
      koiKoiCalls: number
      isMultiplierWin: boolean
    }
  ): Promise<void> {
    // 取得現有統計或建立新的
    let stats = await this.playerStatsRepository.findByPlayerId(playerId)
    if (!stats) {
      stats = createEmptyPlayerStats(playerId)
    }

    // 更新統計
    const updatedStats = updatePlayerStats(stats, params)

    // 儲存
    await this.playerStatsRepository.save(updatedStats)
  }

  /**
   * 更新每日積分
   */
  private async updateDailyScore(
    playerId: string,
    dateString: string,
    params: {
      scoreChange: number
      isWin: boolean
    }
  ): Promise<void> {
    // 取得現有分數或建立新的
    let score = await this.dailyScoreRepository.findByPlayerAndDate(playerId, dateString)
    if (!score) {
      score = createDailyPlayerScore(playerId, dateString)
    }

    // 更新分數
    const updatedScore = updateDailyScore(score, params)

    // 儲存
    await this.dailyScoreRepository.save(updatedScore)
  }
}
