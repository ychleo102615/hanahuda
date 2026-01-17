/**
 * Leaderboard BC DI Container
 *
 * @description
 * Leaderboard Bounded Context 的依賴注入容器。
 * 提供 Use Cases、Repositories 和其他服務的註冊與解析。
 *
 * @module server/leaderboard/adapters/di/container
 */

import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { DrizzleDailyPlayerScoreRepository } from '../persistence/drizzle-daily-player-score-repository'
import { DrizzlePlayerStatsRepository } from '../persistence/drizzle-player-stats-repository'
import { GameFinishedSubscriber } from '../event-subscriber/game-finished-subscriber'
import { GetDailyLeaderboardUseCase } from '../../application/use-cases/get-daily-leaderboard-use-case'
import { GetWeeklyLeaderboardUseCase } from '../../application/use-cases/get-weekly-leaderboard-use-case'
import { GetPlayerStatisticsUseCase } from '../../application/use-cases/get-player-statistics-use-case'
import { UpdatePlayerRecordsUseCase } from '../../application/use-cases/update-player-records-use-case'
import type { DailyPlayerScoreRepositoryPort } from '../../application/ports/output/daily-player-score-repository-port'
import type { PlayerStatsRepositoryPort } from '../../application/ports/output/player-stats-repository-port'
import type { GetLeaderboardInputPort } from '../../application/ports/input/get-leaderboard-input-port'
import type { GetPlayerStatisticsInputPort } from '../../application/ports/input/get-player-statistics-input-port'
import type { UpdatePlayerRecordsInputPort } from '../../application/ports/input/update-player-records-input-port'

type DrizzleDatabase = PostgresJsDatabase<Record<string, unknown>>

/**
 * Leaderboard BC 容器介面
 */
export interface LeaderboardContainer {
  /** 每日玩家積分儲存庫 */
  readonly dailyPlayerScoreRepository: DailyPlayerScoreRepositoryPort
  /** 玩家統計儲存庫 */
  readonly playerStatsRepository: PlayerStatsRepositoryPort
  /** 取得日排行榜 Use Case */
  readonly getDailyLeaderboardUseCase: GetLeaderboardInputPort
  /** 取得週排行榜 Use Case */
  readonly getWeeklyLeaderboardUseCase: GetLeaderboardInputPort
  /** 取得玩家統計 Use Case */
  readonly getPlayerStatisticsUseCase: GetPlayerStatisticsInputPort
  /** 更新玩家記錄 Use Case */
  readonly updatePlayerRecordsUseCase: UpdatePlayerRecordsInputPort
  /** 遊戲結束事件訂閱者 */
  readonly gameFinishedSubscriber: GameFinishedSubscriber
}

/**
 * 建立 Leaderboard BC 容器
 *
 * @param db - Drizzle 資料庫連線
 * @returns Leaderboard 容器實例
 */
export function createLeaderboardContainer(db: DrizzleDatabase): LeaderboardContainer {
  // Repositories
  const dailyPlayerScoreRepository = new DrizzleDailyPlayerScoreRepository(db)
  const playerStatsRepository = new DrizzlePlayerStatsRepository(db)

  // Use Cases
  const getDailyLeaderboardUseCase = new GetDailyLeaderboardUseCase(dailyPlayerScoreRepository)
  const getWeeklyLeaderboardUseCase = new GetWeeklyLeaderboardUseCase(dailyPlayerScoreRepository)
  const getPlayerStatisticsUseCase = new GetPlayerStatisticsUseCase(playerStatsRepository)
  const updatePlayerRecordsUseCase = new UpdatePlayerRecordsUseCase(
    playerStatsRepository,
    dailyPlayerScoreRepository
  )

  // Event Subscriber
  const gameFinishedSubscriber = new GameFinishedSubscriber(updatePlayerRecordsUseCase)

  return {
    dailyPlayerScoreRepository,
    playerStatsRepository,
    getDailyLeaderboardUseCase,
    getWeeklyLeaderboardUseCase,
    getPlayerStatisticsUseCase,
    updatePlayerRecordsUseCase,
    gameFinishedSubscriber,
  }
}

/**
 * 全域 Leaderboard 容器實例（延遲初始化）
 */
let leaderboardContainer: LeaderboardContainer | null = null

/**
 * 取得 Leaderboard 容器
 *
 * @param db - Drizzle 資料庫連線（首次呼叫時必須提供）
 * @returns Leaderboard 容器實例
 */
export function getLeaderboardContainer(db?: DrizzleDatabase): LeaderboardContainer {
  if (!leaderboardContainer) {
    if (!db) {
      throw new Error('Leaderboard container not initialized. Provide db parameter on first call.')
    }
    leaderboardContainer = createLeaderboardContainer(db)
  }
  return leaderboardContainer
}

/**
 * 重置容器（僅供測試使用）
 */
export function resetLeaderboardContainer(): void {
  leaderboardContainer = null
}
