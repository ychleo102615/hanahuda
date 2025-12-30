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
} from '~~/server/domain/game'
import {
  handleDecision as domainHandleDecision,
  calculateRoundEndResult,
} from '~~/server/domain/round'
import type { GameRepositoryPort } from '~~/server/application/ports/output/gameRepositoryPort'
import type { EventPublisherPort } from '~~/server/application/ports/output/eventPublisherPort'
import type { GameTimeoutPort } from '~~/server/application/ports/output/gameTimeoutPort'
import type { RecordGameStatsInputPort } from '~~/server/application/ports/input/recordGameStatsInputPort'
import type { GameStorePort } from '~~/server/application/ports/output/gameStorePort'
import type { DecisionEventMapperPort } from '~~/server/application/ports/output/eventMapperPort'
import type { TurnFlowService } from '~~/server/application/services/turnFlowService'
import type { GameLogRepositoryPort } from '~~/server/application/ports/output/gameLogRepositoryPort'
import type { GameLockPort } from '~~/server/application/ports/output/gameLockPort'
import { COMMAND_TYPES } from '~~/server/database/schema/gameLogs'
import {
  MakeDecisionError,
  type MakeDecisionInputPort,
  type MakeDecisionInput,
  type MakeDecisionOutput,
} from '~~/server/application/ports/input/makeDecisionInputPort'

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
    private readonly gameLock: GameLockPort,
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

    // 記錄命令 (Fire-and-Forget) - 在鎖外執行，用於審計
    this.gameLogRepository?.logAsync({
      gameId,
      playerId,
      eventType: COMMAND_TYPES.MakeDecision,
      payload: { decision },
    })

    // 使用悲觀鎖確保同一遊戲的操作互斥執行
    return this.gameLock.withLock(gameId, async () => {
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

      // 建立倍率資訊（使用 TurnFlowService 的共用方法）
      // 傳入 roundEndResult.isDoubled，讓前端能顯示 7 點翻倍資訊
      const multipliers = this.turnFlowService!.buildMultipliers(game, roundEndResult.isDoubled)

      // 使用 TurnFlowService 處理回合結束（使用新的「局間歸屬上一局尾部」語意）
      // 注意：handleScoredRoundEnd 內部會使用 endRound() 設定結算狀態，
      //       並在倒數結束後呼叫 finalizeRoundAndTransition() 完成轉換
      await this.turnFlowService?.handleScoredRoundEnd(
        gameId,
        game,
        playerId,
        roundEndResult,
        multipliers
      )

      // handleScoredRoundEnd 已處理儲存和事件發送，直接返回
      return { success: true }
    }

      // 6. 儲存更新（僅 KOI_KOI 分支會到達這裡）
      await this.gameRepository.save(game)
      this.gameStore.set(game)

      return { success: true }
    }) // end of withLock
  }
}
