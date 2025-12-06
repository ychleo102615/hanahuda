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
  ScoreMultipliers,
  Yaku,
  PlayerScore,
} from '#shared/contracts'
import {
  updateRound,
  getCurrentFlowState,
  isPlayerTurn,
  getAiPlayer,
  finishRound,
  canContinue,
  startRound,
} from '~~/server/domain/game/game'
import {
  handleDecision as domainHandleDecision,
  getPlayerDepository,
  getPlayerKoiStatus,
} from '~~/server/domain/round/round'
import { detectYaku } from '~~/server/domain/services/yakuDetectionService'
import { calculateScoreFromYaku } from '~~/server/domain/services/scoringService'
import type { GameRepositoryPort } from '~~/server/application/ports/output/gameRepositoryPort'
import type { EventPublisherPort } from '~~/server/application/ports/output/eventPublisherPort'
import type { GameStorePort, EventMapperPort } from './joinGameUseCase'

/**
 * 擴展 EventMapperPort 以支援決策事件
 */
export interface DecisionEventMapperPort extends EventMapperPort {
  toDecisionMadeEvent(
    game: Game,
    playerId: string,
    decision: 'KOI_KOI' | 'END_ROUND',
    multipliers: ScoreMultipliers
  ): DecisionMadeEvent

  toRoundScoredEvent(
    game: Game,
    winnerId: string,
    yakuList: readonly Yaku[],
    baseScore: number,
    finalScore: number,
    multipliers: ScoreMultipliers,
    updatedScores: readonly PlayerScore[]
  ): RoundScoredEvent
}

/**
 * 決策輸入參數
 */
export interface MakeDecisionInput {
  /** 遊戲 ID */
  readonly gameId: string
  /** 玩家 ID */
  readonly playerId: string
  /** 決策 */
  readonly decision: 'KOI_KOI' | 'END_ROUND'
}

/**
 * 決策輸出結果
 */
export interface MakeDecisionOutput {
  /** 是否成功 */
  readonly success: true
}

/**
 * 決策錯誤
 */
export class MakeDecisionError extends Error {
  constructor(
    public readonly code: 'WRONG_PLAYER' | 'INVALID_STATE' | 'GAME_NOT_FOUND',
    message: string
  ) {
    super(message)
    this.name = 'MakeDecisionError'
  }
}

/**
 * MakeDecisionUseCase
 *
 * 處理玩家 Koi-Koi 決策的完整流程。
 */
export class MakeDecisionUseCase {
  constructor(
    private readonly gameRepository: GameRepositoryPort,
    private readonly eventPublisher: EventPublisherPort,
    private readonly gameStore: GameStorePort,
    private readonly eventMapper: DecisionEventMapperPort
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

    // 1. 取得遊戲狀態
    const existingGame = await this.gameRepository.findById(gameId)
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

      // 如果換到 AI，觸發 AI 回合（Phase 5 實作）
      const aiPlayer = getAiPlayer(game)
      if (aiPlayer && game.currentRound?.activePlayerId === aiPlayer.id) {
        // TODO: 觸發 AI 回合（T052-T055 實作）
        console.log(`[MakeDecisionUseCase] AI turn triggered for player ${aiPlayer.id}`)
      }
    } else {
      // 5b. END_ROUND: 結束局並計分
      const depository = getPlayerDepository(game.currentRound, playerId)
      const yakuList = detectYaku(depository, game.ruleset.yaku_settings)
      const koiStatus = getPlayerKoiStatus(game.currentRound, playerId)

      // 使用 Domain Service 計算分數
      const scoreResult = calculateScoreFromYaku(yakuList, koiStatus)

      // 結束局
      game = finishRound(game, playerId, scoreResult.finalScore)

      // 建立倍率資訊
      const multipliers = this.buildMultipliers(existingGame) // 使用更新前的遊戲取得倍率

      const event = this.eventMapper.toRoundScoredEvent(
        game,
        playerId,
        yakuList,
        scoreResult.baseScore,
        scoreResult.finalScore,
        multipliers,
        game.cumulativeScores
      )
      this.eventPublisher.publishToGame(gameId, event)

      // 檢查是否繼續下一局
      if (canContinue(game)) {
        // 開始新局
        game = startRound(game)

        // 發送 RoundDealt 事件（延遲讓前端顯示結算畫面）
        setTimeout(() => {
          const roundDealtEvent = this.eventMapper.toRoundDealtEvent(game)
          this.eventPublisher.publishToGame(gameId, roundDealtEvent)
        }, 5000) // display_timeout_seconds 預設 5 秒
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
}
