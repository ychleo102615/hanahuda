/**
 * GetWeeklyLeaderboardUseCase
 *
 * @description
 * 取得週排行榜的 Use Case。
 * 從 Repository 取得本週排行榜資料並計算排名。
 *
 * @module server/leaderboard/application/use-cases/get-weekly-leaderboard-use-case
 */

import type {
  GetLeaderboardInputPort,
  GetLeaderboardRequest,
  GetLeaderboardResponse,
} from '../ports/input/get-leaderboard-input-port'
import type { DailyPlayerScoreRepositoryPort } from '../ports/output/daily-player-score-repository-port'
import { calculateRanks } from '~~/server/leaderboard/domain/leaderboard/leaderboard-entry'

/**
 * 取得週排行榜 Use Case
 */
export class GetWeeklyLeaderboardUseCase implements GetLeaderboardInputPort {
  constructor(
    private readonly dailyScoreRepository: DailyPlayerScoreRepositoryPort
  ) {}

  /**
   * 執行取得週排行榜
   *
   * @param request - 請求參數
   * @returns 週排行榜回應
   */
  async execute(request: GetLeaderboardRequest): Promise<GetLeaderboardResponse> {
    // 從 Repository 取得排行榜原始資料（本週匯總）
    const rawData = await this.dailyScoreRepository.getLeaderboard('weekly', request.limit)

    // 計算排名
    const entries = calculateRanks(rawData)

    // 檢查當前玩家是否需要額外取得排名
    let currentPlayerRank: number | undefined

    if (request.currentPlayerId) {
      // 檢查玩家是否已在排行榜中
      const isInEntries = entries.some(e => e.playerId === request.currentPlayerId)

      if (!isInEntries) {
        // 玩家不在前 N 名內，額外取得其排名
        const rank = await this.dailyScoreRepository.getPlayerRank(request.currentPlayerId, 'weekly')
        if (rank !== null) {
          currentPlayerRank = rank
        }
      }
    }

    return {
      entries,
      currentPlayerRank,
      type: 'weekly',
    }
  }
}
