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
  DecisionMadeEvent,
  RoundScoredEvent,
  RoundDealtEvent,
  GameFinishedEvent,
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
import {
  MakeDecisionError,
  type MakeDecisionInputPort,
  type MakeDecisionInput,
  type MakeDecisionOutput,
} from '~~/server/application/ports/input/makeDecisionInputPort'
import { gameConfig } from '~~/server/utils/config'

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
    private readonly recordGameStatsUseCase?: RecordGameStatsInputPort
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

    // 0. 清除當前遊戲的超時計時器
    this.gameTimeoutManager?.clearTimeout(gameId)

    // 0.1 若為玩家主動操作，重置閒置計時器
    if (!isAutoAction) {
      this.gameTimeoutManager?.resetIdleTimeout(gameId, playerId)
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
        console.log(`[MakeDecisionUseCase] KOI_KOI but round should end, handling round draw`)
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

      // 根據轉換結果決定 displayTimeoutSeconds
      const isNextRound = transitionResult.transitionType === 'NEXT_ROUND'
      const displayTimeoutSeconds = isNextRound
        ? gameConfig.display_timeout_seconds
        : undefined

      // 檢查是否需要確認繼續遊戲
      const requireConfirmation = this.turnFlowService?.handleRoundEndConfirmation(gameId, game) ?? false

      // 發送 RoundEnded 事件（reason: SCORED）
      const scoringData = {
        winner_id: playerId,
        yaku_list: roundEndResult.yakuList,
        base_score: roundEndResult.baseScore,
        final_score: roundEndResult.finalScore,
        multipliers,
      }
      const roundEndedEvent = this.eventMapper.toRoundEndedEvent(
        'SCORED',
        game.cumulativeScores,
        scoringData,
        undefined,
        displayTimeoutSeconds,
        requireConfirmation
      )
      this.eventPublisher.publishToGame(gameId, roundEndedEvent)

      // 檢查是否有斷線/離開玩家（Phase 5: 回合結束時檢查）
      const finishedGame = this.turnFlowService?.checkAndHandleDisconnectedPlayers(gameId, game)
      if (finishedGame) {
        // 已處理遊戲結束，從記憶體移除並儲存到 DB
        game = finishedGame
        // 樂觀鎖檢查
        const currentGame = this.gameStore.get(gameId)
        if (currentGame?.currentRound?.version !== oldVersion) {
          throw new MakeDecisionError('VERSION_CONFLICT', 'Concurrent modification detected')
        }
        this.gameStore.delete(gameId)
        await this.gameRepository.save(game)
        console.log(`[MakeDecisionUseCase] Game ended due to disconnected player`)
        return { success: true }
      }

      // 根據轉換結果決定下一步
      if (isNextRound) {
        // 發送 RoundDealt 事件（延遲讓前端顯示結算畫面）
        const firstPlayerId = game.currentRound?.activePlayerId
        this.turnFlowService?.startDisplayTimeout(gameId, () => {
          const roundDealtEvent = this.eventMapper.toRoundDealtEvent(game)
          this.eventPublisher.publishToGame(gameId, roundDealtEvent)

          // 啟動新回合第一位玩家的超時
          if (firstPlayerId) {
            this.turnFlowService?.startTimeoutForPlayer(gameId, firstPlayerId, 'AWAITING_HAND_PLAY')
          }
        })
      } else {
        // 遊戲結束 - 記錄統計並發送 GameFinished 事件
        const winner = transitionResult.winner
        if (winner) {
          // 清除遊戲的所有計時器
          this.gameTimeoutManager?.clearAllForGame(gameId)

          // 取得勝者的 Koi-Koi 倍率
          const winnerKoiStatus = existingGame.currentRound?.koiStatuses.find(
            k => k.player_id === playerId
          )
          const winnerKoiMultiplier = winnerKoiStatus?.koi_multiplier ?? 1

          // 記錄遊戲統計
          if (this.recordGameStatsUseCase) {
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
              console.error(`[MakeDecisionUseCase] Failed to record game stats:`, error)
              // 統計記錄失敗不應影響遊戲結束流程
            }
          }

          const gameFinishedEvent = this.eventMapper.toGameFinishedEvent(
            winner.winnerId,
            winner.finalScores,
            'NORMAL'
          )
          this.eventPublisher.publishToGame(gameId, gameFinishedEvent)
        }
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

    console.log(`[MakeDecisionUseCase] Player ${playerId} decided: ${decision}`)

    return { success: true }
  }
}
