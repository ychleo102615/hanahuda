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

import type { Game } from '~~/server/domain/game/game'
import type {
  DecisionMadeEvent,
  RoundScoredEvent,
  RoundDealtEvent,
  GameFinishedEvent,
  ScoreMultipliers,
  Yaku,
  PlayerScore,
} from '#shared/contracts'
import {
  updateRound,
  getCurrentFlowState,
  isPlayerTurn,
  getAiPlayer,
  shouldEndRound,
} from '~~/server/domain/game/game'
import {
  handleDecision as domainHandleDecision,
  getPlayerDepository,
  getPlayerKoiStatus,
  calculateRoundEndResult,
} from '~~/server/domain/round/round'
import {
  transitionAfterRoundScored,
  transitionAfterRoundDraw,
} from '~~/server/domain/services/roundTransitionService'
import type { GameRepositoryPort } from '~~/server/application/ports/output/gameRepositoryPort'
import type { EventPublisherPort } from '~~/server/application/ports/output/eventPublisherPort'
import type { GameTimeoutPort } from '~~/server/application/ports/output/gameTimeoutPort'
import type { AutoActionInputPort } from '~~/server/application/ports/input/autoActionInputPort'
import type { RecordGameStatsInputPort } from '~~/server/application/ports/input/recordGameStatsInputPort'
import type { GameStorePort } from '~~/server/application/ports/output/gameStorePort'
import type { DecisionEventMapperPort } from '~~/server/application/ports/output/eventMapperPort'
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
  constructor(
    private readonly gameRepository: GameRepositoryPort,
    private readonly eventPublisher: EventPublisherPort,
    private readonly gameStore: GameStorePort,
    private readonly eventMapper: DecisionEventMapperPort,
    private readonly gameTimeoutManager?: GameTimeoutPort,
    private readonly autoActionUseCase?: AutoActionInputPort,
    private readonly recordGameStatsUseCase?: RecordGameStatsInputPort
  ) {}

  /**
   * 執行決策用例
   *
   * @param input - 決策參數
   * @returns 結果
   * @throws MakeDecisionError 如果操作無效
   */
  async execute(input: MakeDecisionInput): Promise<MakeDecisionOutput> {
    const { gameId, playerId, decision } = input

    // 0. 清除當前遊戲的超時計時器
    this.gameTimeoutManager?.clearTimeout(gameId)

    // 1. 取得遊戲狀態（從記憶體讀取，因為 currentRound 不儲存於 DB）
    const existingGame = this.gameStore.get(gameId)
    if (!existingGame) {
      throw new MakeDecisionError('GAME_NOT_FOUND', `Game not found: ${gameId}`)
    }

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

      // 建立倍率資訊
      const multipliers = this.buildMultipliers(game)

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
        game = await this.handleRoundDraw(gameId, game)
      } else {
        // 啟動下一位玩家的超時（KOI_KOI 後換人）
        const nextPlayerId = game.currentRound?.activePlayerId
        if (nextPlayerId) {
          this.startTimeoutForPlayer(gameId, nextPlayerId, 'AWAITING_HAND_PLAY')
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

      // 建立倍率資訊（使用更新前的遊戲取得倍率）
      const multipliers = this.buildMultipliers(existingGame)

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

      // 發送 RoundScored 事件
      const roundScoredEvent = this.eventMapper.toRoundScoredEvent(
        game,
        playerId,
        roundEndResult.yakuList,
        roundEndResult.baseScore,
        roundEndResult.finalScore,
        multipliers,
        game.cumulativeScores,
        displayTimeoutSeconds
      )
      this.eventPublisher.publishToGame(gameId, roundScoredEvent)

      // 根據轉換結果決定下一步
      if (isNextRound) {
        // 發送 RoundDealt 事件（延遲讓前端顯示結算畫面）
        const firstPlayerId = game.currentRound?.activePlayerId
        this.startDisplayTimeout(gameId, () => {
          const roundDealtEvent = this.eventMapper.toRoundDealtEvent(game)
          this.eventPublisher.publishToGame(gameId, roundDealtEvent)

          // 啟動新回合第一位玩家的超時
          if (firstPlayerId) {
            this.startTimeoutForPlayer(gameId, firstPlayerId, 'AWAITING_HAND_PLAY')
          }
        })
      } else {
        // 遊戲結束 - 記錄統計並發送 GameFinished 事件
        const winner = transitionResult.winner
        if (winner) {
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
            winner.finalScores
          )
          this.eventPublisher.publishToGame(gameId, gameFinishedEvent)
        }
      }
    }

    // 6. 儲存更新
    this.gameStore.set(game)
    await this.gameRepository.save(game)

    console.log(`[MakeDecisionUseCase] Player ${playerId} decided: ${decision}`)

    return { success: true }
  }

  /**
   * 建立倍率資訊
   */
  private buildMultipliers(game: Game): ScoreMultipliers {
    if (!game.currentRound) {
      return { player_multipliers: {} }
    }

    const playerMultipliers: Record<string, number> = {}
    for (const koiStatus of game.currentRound.koiStatuses) {
      playerMultipliers[koiStatus.player_id] = koiStatus.koi_multiplier
    }

    return { player_multipliers: playerMultipliers }
  }

  /**
   * 處理流局
   *
   * @description
   * 當 KOI_KOI 後發現無法繼續（雙方手牌都空了）時呼叫。
   * 使用 Domain Service 處理流局轉換並發送對應事件。
   *
   * @param gameId - 遊戲 ID
   * @param game - 目前遊戲狀態
   * @returns 更新後的遊戲狀態
   */
  private async handleRoundDraw(gameId: string, game: Game): Promise<Game> {
    // 使用 Domain Service 處理流局轉換
    const transitionResult = transitionAfterRoundDraw(game)
    const updatedGame = transitionResult.game

    // 根據轉換結果決定 displayTimeoutSeconds
    const isNextRound = transitionResult.transitionType === 'NEXT_ROUND'
    const displayTimeoutSeconds = isNextRound
      ? gameConfig.display_timeout_seconds
      : undefined

    // 發送 RoundDrawn 事件
    const roundDrawnEvent = this.eventMapper.toRoundDrawnEvent(
      updatedGame.cumulativeScores,
      displayTimeoutSeconds
    )
    this.eventPublisher.publishToGame(gameId, roundDrawnEvent)

    // 根據轉換結果決定下一步
    if (isNextRound) {
      // 延遲後發送 RoundDealt 事件（讓前端顯示流局畫面）
      const firstPlayerId = updatedGame.currentRound?.activePlayerId
      this.startDisplayTimeout(gameId, () => {
        const roundDealtEvent = this.eventMapper.toRoundDealtEvent(updatedGame)
        this.eventPublisher.publishToGame(gameId, roundDealtEvent)

        // 啟動新回合第一位玩家的超時
        if (firstPlayerId) {
          this.startTimeoutForPlayer(gameId, firstPlayerId, 'AWAITING_HAND_PLAY')
        }
      })
    } else {
      // 遊戲結束
      const winner = transitionResult.winner
      if (winner) {
        const gameFinishedEvent = this.eventMapper.toGameFinishedEvent(
          winner.winnerId,
          winner.finalScores
        )
        this.eventPublisher.publishToGame(gameId, gameFinishedEvent)
      }
    }

    return updatedGame
  }

  /**
   * 啟動顯示超時計時器
   *
   * 用於局結束後的延遲，讓前端顯示結算畫面後再推進遊戲。
   *
   * @param gameId - 遊戲 ID
   * @param onTimeout - 超時回調函數
   */
  private startDisplayTimeout(gameId: string, onTimeout: () => void): void {
    if (this.gameTimeoutManager) {
      this.gameTimeoutManager.startTimeout(
        gameId,
        gameConfig.display_timeout_seconds,
        onTimeout
      )
    } else {
      // Fallback: 直接使用 setTimeout
      const displayTimeoutMs = gameConfig.display_timeout_seconds * 1000
      setTimeout(onTimeout, displayTimeoutMs)
    }
  }

  /**
   * 為玩家啟動操作超時計時器
   *
   * @param gameId - 遊戲 ID
   * @param playerId - 玩家 ID
   * @param flowState - 目前流程狀態
   */
  private startTimeoutForPlayer(
    gameId: string,
    playerId: string,
    flowState: 'AWAITING_HAND_PLAY' | 'AWAITING_SELECTION' | 'AWAITING_DECISION'
  ): void {
    if (!this.gameTimeoutManager || !this.autoActionUseCase) {
      return
    }

    this.gameTimeoutManager.startTimeout(
      gameId,
      gameConfig.action_timeout_seconds,
      () => {
        console.log(`[MakeDecisionUseCase] Timeout for player ${playerId} in game ${gameId}, executing auto-action`)
        this.autoActionUseCase!.execute({
          gameId,
          playerId,
          currentFlowState: flowState,
        }).catch((error) => {
          console.error(`[MakeDecisionUseCase] Auto-action failed:`, error)
        })
      }
    )
  }
}
