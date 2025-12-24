/**
 * MakeDecisionUseCase - Application Layer
 *
 * @description
 * 處理玩家 Koi-Koi 決策的用例。
 * KOI_KOI: 繼續遊戲，倍率加倍
 * END_ROUND: 結束局，計分
 *
 * @module server/application/use-cases/makeDecisionUseCase
 */

import {
  updateRound,
  getCurrentFlowState,
  isPlayerTurn,
  shouldEndRound,
  type Game,
} from '~~/server/domain/game'
import type {
  Yaku,
  PlayerScore,
} from '#shared/contracts'
import {
  handleDecision as domainHandleDecision,
  calculateRoundEndResult,
} from '~~/server/domain/round'
import {
  transitionAfterRoundScored,
} from '~~/server/domain/services/roundTransitionService'
import type { GameRepositoryPort } from '~~/server/application/ports/output/gameRepositoryPort'
import type { EventPublisherPort } from '~~/server/application/ports/output/eventPublisherPort'
import type { GameTimeoutPort } from '~~/server/application/ports/output/gameTimeoutPort'
import type { RecordGameStatsInputPort } from '~~/server/application/ports/input/recordGameStatsInputPort'
import type { GameStorePort } from '~~/server/application/ports/output/gameStorePort'
import type { DecisionEventMapperPort } from '~~/server/application/ports/output/eventMapperPort'
import type { TurnFlowService } from '~~/server/application/services/turnFlowService'
import type { GameLogRepositoryPort } from '~~/server/application/ports/output/gameLogRepositoryPort'
import { COMMAND_TYPES } from '~~/server/database/schema/gameLogs'
import {
  MakeDecisionError,
  type MakeDecisionInputPort,
  type MakeDecisionInput,
  type MakeDecisionOutput,
} from '~~/server/application/ports/input/makeDecisionInputPort'
import { loggers } from '~~/server/utils/logger'

/** Module logger instance */
const logger = loggers.useCase('MakeDecision')

// Re-export for backwards compatibility
export { MakeDecisionError } from '~~/server/application/ports/input/makeDecisionInputPort'
export type { DecisionEventMapperPort } from '~~/server/application/ports/output/eventMapperPort'

/**
 * MakeDecisionUseCase
 *
 * 處理玩家 Koi-Koi 決策的完整流程。
 */
export class MakeDecisionUseCase implements MakeDecisionInputPort {
  private turnFlowService?: TurnFlowService

  constructor(
    private readonly gameRepository: GameRepositoryPort,
    private readonly eventPublisher: EventPublisherPort,
    private readonly gameStore: GameStorePort,
    private readonly eventMapper: DecisionEventMapperPort,
    private readonly gameTimeoutManager?: GameTimeoutPort,
    private readonly recordGameStatsUseCase?: RecordGameStatsInputPort,
    private readonly gameLogRepository?: GameLogRepositoryPort
  ) {}

  /**
   * 設定 TurnFlowService（用於解決循環依賴）
   */
  setTurnFlowService(service: TurnFlowService): void {
    this.turnFlowService = service
  }

  /**
   * 執行決策用例
   *
   * @param input - 決策參數
   * @returns 結果
   * @throws MakeDecisionError 如果操作無效
   */
  async execute(input: MakeDecisionInput): Promise<MakeDecisionOutput> {
    const { gameId, playerId, decision, isAutoAction } = input

    // 記錄命令 (Fire-and-Forget)
    this.gameLogRepository?.logAsync({
      gameId,
      playerId,
      eventType: COMMAND_TYPES.MakeDecision,
      payload: { decision },
    })

    // 0. 清除當前遊戲的超時計時器
    this.gameTimeoutManager?.clearTimeout(gameId)

    // 0.1 若為玩家主動操作，處理閒置相關邏輯
    if (!isAutoAction) {
      await this.turnFlowService?.handlePlayerActiveOperation(gameId, playerId)
    }

    // 1. 取得遊戲狀態（從記憶體讀取，因為 currentRound 不儲存於 DB）
    const existingGame = this.gameStore.get(gameId)
    if (!existingGame) {
      throw new MakeDecisionError('GAME_NOT_FOUND', `Game not found: ${gameId}`)
    }

    // 樂觀鎖：記住讀取時的版本
    const oldVersion = existingGame.currentRound?.version

    let game = existingGame

    // 2. 驗證玩家回合
    if (!isPlayerTurn(game, playerId)) {
      throw new MakeDecisionError('WRONG_PLAYER', `Not player's turn: ${playerId}`)
    }

    // 3. 驗證流程狀態
    const flowState = getCurrentFlowState(game)
    if (flowState !== 'AWAITING_DECISION') {
      throw new MakeDecisionError('INVALID_STATE', `Invalid flow state: ${flowState}`)
    }

    if (!game.currentRound) {
      throw new MakeDecisionError('INVALID_STATE', 'No current round')
    }

    // 4. 執行 Domain 操作
    const decisionResult = domainHandleDecision(game.currentRound, playerId, decision)

    if (decision === 'KOI_KOI') {
      // 5a. KOI_KOI: 繼續遊戲
      game = updateRound(game, decisionResult.updatedRound)

      // 建立倍率資訊（使用 TurnFlowService 的共用方法）
      const multipliers = this.turnFlowService!.buildMultipliers(game)

      const event = this.eventMapper.toDecisionMadeEvent(
        game,
        playerId,
        'KOI_KOI',
        multipliers
      )
      this.eventPublisher.publishToGame(gameId, event)

      // 檢查是否應該結束局（KOI_KOI 後可能無法繼續，例如雙方手牌都空了）
      if (shouldEndRound(game)) {
        // 即使選擇 KOI_KOI，如果無法繼續，也要進入流局處理
        logger.info('KOI_KOI but round should end, handling round draw', { gameId })
        if (this.turnFlowService) {
          game = await this.turnFlowService.handleRoundDraw(gameId, game)
        }
      } else {
        // 啟動下一位玩家的超時（KOI_KOI 後換人）
        const nextPlayerId = game.currentRound?.activePlayerId
        if (nextPlayerId) {
          this.turnFlowService?.startTimeoutForPlayer(gameId, nextPlayerId, 'AWAITING_HAND_PLAY')
        }
      }
    } else {
      // 5b. END_ROUND: 結束局並計分
      // 使用 Domain Service 計算局結束結果
      const roundEndResult = calculateRoundEndResult(
        game.currentRound,
        playerId,
        game.ruleset.yaku_settings
      )

      // 建立倍率資訊（使用 TurnFlowService 的共用方法，傳入更新前的遊戲取得倍率）
      const multipliers = this.turnFlowService!.buildMultipliers(existingGame)

      // 使用 Domain Service 處理局轉換
      const transitionResult = transitionAfterRoundScored(
        game,
        playerId,
        roundEndResult.finalScore
      )
      game = transitionResult.game

      // 取得勝者的 Koi-Koi 倍率
      const winnerKoiStatus = existingGame.currentRound?.koiStatuses.find(
        k => k.player_id === playerId
      )
      const winnerKoiMultiplier = winnerKoiStatus?.koi_multiplier ?? 1

      // 記錄統計
      if (this.recordGameStatsUseCase) {
        if (transitionResult.transitionType === 'GAME_FINISHED') {
          // 遊戲結束：記錄完整統計（勝負場次 + 役種/Koi-Koi/倍率）
          const winner = transitionResult.winner
          if (winner) {
            try {
              await this.recordGameStatsUseCase.execute({
                gameId,
                winnerId: winner.winnerId,
                finalScores: winner.finalScores,
                winnerYakuList: roundEndResult.yakuList,
                winnerKoiMultiplier,
                players: game.players,
              })
            } catch (error) {
              logger.error('Failed to record game stats', error, { gameId })
              // 統計記錄失敗不應影響遊戲結束流程
            }
          }
        } else if (transitionResult.transitionType === 'NEXT_ROUND') {
          // 局結束但遊戲繼續：只記錄該局的役種/Koi-Koi/倍率
          try {
            // 取得該局的累積分數作為 finalScores
            const currentScores: PlayerScore[] = game.players.map(p => ({
              player_id: p.id,
              score: game.cumulativeScores.find(s => s.player_id === p.id)?.score ?? 0,
            }))

            await this.recordGameStatsUseCase.execute({
              gameId,
              winnerId: playerId,
              finalScores: currentScores,
              winnerYakuList: roundEndResult.yakuList,
              winnerKoiMultiplier,
              players: game.players,
              isRoundEndOnly: true,
            })
            logger.info('Recorded round-only stats', { gameId, roundWinner: playerId })
          } catch (error) {
            logger.error('Failed to record round-only stats', error, { gameId })
            // 統計記錄失敗不應影響遊戲流程
          }
        }
      }

      // 使用 TurnFlowService 的共用方法處理回合結束
      const scoringData = {
        winner_id: playerId,
        yaku_list: roundEndResult.yakuList,
        base_score: roundEndResult.baseScore,
        final_score: roundEndResult.finalScore,
        multipliers,
      }
      const gameEnded = await this.turnFlowService?.handleScoredRoundEnd(
        gameId,
        game,
        transitionResult,
        scoringData
      )
      if (gameEnded) {
        // 已在 endGame() 中處理儲存和記憶體移除
        logger.info('Game ended', { gameId })
        return { success: true }
      }
    }

    // 6. 儲存更新
    // 樂觀鎖檢查
    const currentGame = this.gameStore.get(gameId)
    if (currentGame?.currentRound?.version !== oldVersion) {
      throw new MakeDecisionError('VERSION_CONFLICT', 'Concurrent modification detected')
    }
    await this.gameRepository.save(game)
    if (game.status === 'FINISHED') {
      // 遊戲結束，從記憶體移除
      this.gameStore.delete(gameId)
    } else {
      this.gameStore.set(game)
    }

    logger.info('Player decided', { playerId, decision, gameId })

    return { success: true }
  }
}
