/**
 * RecordGameStatsUseCase - Application Layer
 *
 * @description
 * 處理遊戲結束後記錄玩家統計的用例。
 * 只記錄人類玩家的統計，不記錄 AI 玩家。
 *
 * @module server/application/use-cases/recordGameStatsUseCase
 */

import type { PlayerStatsRepositoryPort, UpsertPlayerStatsInput } from '~~/server/application/ports/output/playerStatsRepositoryPort'
import {
  RecordGameStatsError,
  type RecordGameStatsInputPort,
  type RecordGameStatsInput,
  type RecordGameStatsOutput,
} from '~~/server/application/ports/input/recordGameStatsInputPort'

import { loggers } from '~~/server/utils/logger'

/** Module logger instance */
const logger = loggers.useCase('RecordGameStats')

// Re-export for backwards compatibility
export { RecordGameStatsError } from '~~/server/application/ports/input/recordGameStatsInputPort'

/**
 * RecordGameStatsUseCase
 *
 * 處理遊戲結束後記錄玩家統計的完整流程。
 */
export class RecordGameStatsUseCase implements RecordGameStatsInputPort {
  constructor(
    private readonly playerStatsRepository: PlayerStatsRepositoryPort
  ) {}

  /**
   * 執行記錄遊戲統計用例
   *
   * @param input - 遊戲統計參數
   * @returns 結果
   * @throws RecordGameStatsError 如果操作失敗
   */
  async execute(input: RecordGameStatsInput): Promise<RecordGameStatsOutput> {
    const {
      gameId,
      winnerId,
      finalScores,
      winnerYakuList,
      winnerKoiMultiplier,
      players,
      isRoundEndOnly,
    } = input

    logger.info('Recording stats for game', {
      gameId,
      winnerId: winnerId ?? 'DRAW',
      isRoundEndOnly: isRoundEndOnly ?? false,
    })

    // 過濾出人類玩家
    const humanPlayers = players.filter(p => !p.isAi)

    if (humanPlayers.length === 0) {
      logger.info('No human players, skipping stats recording', { gameId })
      return { success: true }
    }

    // 為每位人類玩家記錄統計
    for (const player of humanPlayers) {
      const isWinner = winnerId === player.id
      const isLoser = winnerId !== null && winnerId !== player.id

      // 從 finalScores 中找到該玩家的分數
      const playerScore = finalScores.find(s => s.player_id === player.id)
      const scoreChange = playerScore?.score ?? 0

      // 建構役種計數（只有勝者才有役種）
      const yakuCounts: Record<string, number> = {}
      if (isWinner) {
        for (const yaku of winnerYakuList) {
          const currentCount = yakuCounts[yaku.yaku_type] ?? 0
          yakuCounts[yaku.yaku_type] = currentCount + 1
        }
      }

      // 計算 Koi-Koi 次數（倍率 - 1 = 宣告次數）
      const koiKoiCallCount = isWinner ? Math.max(0, winnerKoiMultiplier - 1) : 0

      // 判斷是否為倍率獲勝（透過 Koi-Koi 倍率獲得額外分數）
      const hadMultiplierWin = isWinner && winnerKoiMultiplier > 1

      const upsertInput: UpsertPlayerStatsInput = {
        playerId: player.id,
        scoreChange,
        isWinner,
        isLoser,
        yakuCounts,
        koiKoiCallCount,
        hadMultiplierWin,
        isRoundEndOnly,
      }

      try {
        await this.playerStatsRepository.upsert(upsertInput)
        logger.info('Recorded stats for player', {
          playerId: player.id,
          scoreChange,
          isWinner,
          isLoser,
          yakuCount: Object.keys(yakuCounts).length,
        })
      } catch (error) {
        logger.error('Failed to record stats for player', error, { playerId: player.id })
        throw new RecordGameStatsError(
          'REPOSITORY_ERROR',
          `Failed to record stats for player ${player.id}: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }

    logger.info('Successfully recorded stats for human players', { gameId, count: humanPlayers.length })

    return { success: true }
  }
}
