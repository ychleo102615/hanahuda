/**
 * GetPlayerStatisticsUseCase
 *
 * @description
 * 取得玩家統計的 Use Case。
 *
 * @module server/leaderboard/application/use-cases/get-player-statistics-use-case
 */

import type {
  GetPlayerStatisticsInputPort,
  GetPlayerStatisticsRequest,
  GetPlayerStatisticsResponse,
} from '../ports/input/get-player-statistics-input-port'
import type { PlayerStatsRepositoryPort } from '../ports/output/player-stats-repository-port'
import {
  createPlayerStatistics,
  createEmptyStatistics,
} from '~~/server/leaderboard/domain/statistics/player-statistics'

/**
 * 取得玩家統計 Use Case
 */
export class GetPlayerStatisticsUseCase implements GetPlayerStatisticsInputPort {
  constructor(
    private readonly playerStatsRepository: PlayerStatsRepositoryPort
  ) {}

  /**
   * 執行取得玩家統計
   *
   * @param request - 請求參數
   * @returns 玩家統計回應
   */
  async execute(request: GetPlayerStatisticsRequest): Promise<GetPlayerStatisticsResponse> {
    const timeRange = request.timeRange ?? 'all'

    // 從 Repository 取得玩家統計資料
    const playerStats = await this.playerStatsRepository.findByPlayerId(request.playerId)

    // 如果找不到資料，返回空的統計
    if (!playerStats) {
      return {
        statistics: createEmptyStatistics(request.playerId),
        timeRange,
      }
    }

    // 建立帶計算欄位的統計
    const statistics = createPlayerStatistics({
      playerId: playerStats.playerId,
      totalScore: playerStats.totalScore,
      gamesPlayed: playerStats.gamesPlayed,
      gamesWon: playerStats.gamesWon,
      gamesLost: playerStats.gamesLost,
      koiKoiCalls: playerStats.koiKoiCalls,
      multiplierWins: playerStats.multiplierWins,
      yakuCounts: playerStats.yakuCounts,
    })

    return {
      statistics,
      timeRange,
    }
  }
}
