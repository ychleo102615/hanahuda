/**
 * SelectTargetUseCase - Application Layer
 *
 * @description
 * 處理玩家選擇配對目標的用例（雙重配對時）。
 * 執行配對、役種檢測，並發佈對應事件。
 *
 * @module server/application/use-cases/selectTargetUseCase
 */

import type {
  YakuUpdate,
} from '#shared/contracts'
import {
  updateRound,
  getCurrentFlowState,
  isPlayerTurn,
  shouldEndRound,
} from '~~/server/core-game/domain/game'
import {
  selectTarget as domainSelectTarget,
  advanceToNextPlayer,
  setAwaitingDecision,
  getPlayerDepository,
  canPlayerKoiKoi,
  calculateRoundEndResult,
} from '~~/server/core-game/domain/round'
import {
  detectYaku,
  detectNewYaku,
} from '~~/server/core-game/domain/services/yakuDetectionService'
import type { GameRepositoryPort } from '~~/server/core-game/application/ports/output/gameRepositoryPort'
import type { EventPublisherPort } from '~~/server/core-game/application/ports/output/eventPublisherPort'
import type { GameTimeoutPort } from '~~/server/core-game/application/ports/output/gameTimeoutPort'
import type { GameStorePort } from '~~/server/core-game/application/ports/output/gameStorePort'
import type { SelectionEventMapperPort } from '~~/server/core-game/application/ports/output/eventMapperPort'
import type { GameLogRepositoryPort } from '~~/server/core-game/application/ports/output/gameLogRepositoryPort'
import type { GameLockPort } from '~~/server/core-game/application/ports/output/gameLockPort'
import { COMMAND_TYPES } from '~~/server/database/schema/gameLogs'
import type { TurnFlowService } from '~~/server/core-game/application/services/turnFlowService'
import type { RecordGameStatsInputPort } from '~~/server/core-game/application/ports/input/recordGameStatsInputPort'
import {
  SelectTargetError,
  type SelectTargetInputPort,
  type SelectTargetInput,
  type SelectTargetOutput,
} from '~~/server/core-game/application/ports/input/selectTargetInputPort'

// Re-export for backwards compatibility
export { SelectTargetError } from '~~/server/core-game/application/ports/input/selectTargetInputPort'
export type { SelectionEventMapperPort } from '~~/server/core-game/application/ports/output/eventMapperPort'

/**
 * SelectTargetUseCase
 *
 * 處理玩家選擇配對目標的完整流程。
 */
export class SelectTargetUseCase implements SelectTargetInputPort {
  private turnFlowService?: TurnFlowService

  constructor(
    private readonly gameRepository: GameRepositoryPort,
    private readonly eventPublisher: EventPublisherPort,
    private readonly gameStore: GameStorePort,
    private readonly eventMapper: SelectionEventMapperPort,
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
   * 執行選擇配對目標用例
   *
   * @param input - 選擇參數
   * @returns 結果
   * @throws SelectTargetError 如果操作無效
   */
  async execute(input: SelectTargetInput): Promise<SelectTargetOutput> {
    const { gameId, playerId, sourceCardId, targetCardId, isAutoAction } = input

    // 記錄命令 (Fire-and-Forget) - 在鎖外執行，用於審計
    this.gameLogRepository?.logAsync({
      gameId,
      playerId,
      eventType: COMMAND_TYPES.SelectTarget,
      payload: { sourceCardId, targetCardId },
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
        throw new SelectTargetError('GAME_NOT_FOUND', `Game not found: ${gameId}`)
      }

      let game = existingGame

    // 2. 驗證玩家回合
    if (!isPlayerTurn(game, playerId)) {
      throw new SelectTargetError('WRONG_PLAYER', `Not player's turn: ${playerId}`)
    }

    // 3. 驗證流程狀態
    const flowState = getCurrentFlowState(game)
    if (flowState !== 'AWAITING_SELECTION') {
      throw new SelectTargetError('INVALID_STATE', `Invalid flow state: ${flowState}`)
    }

    if (!game.currentRound) {
      throw new SelectTargetError('INVALID_STATE', 'No current round')
    }

    // 4. 驗證 pendingSelection
    const pending = game.currentRound.pendingSelection
    if (!pending) {
      throw new SelectTargetError('INVALID_STATE', 'No pending selection')
    }

    if (pending.drawnCard !== sourceCardId) {
      throw new SelectTargetError('INVALID_SELECTION', `Source card mismatch: expected ${pending.drawnCard}, got ${sourceCardId}`)
    }

    // 5. 取得手牌操作前的役種（從 pendingSelection 中取得，確保基準點正確）
    // 這是修復 Bug 的關鍵：使用手牌操作前的役種作為基準，而非選擇配對前的役種
    const previousYaku = pending.previousYaku

    // 6. 執行 Domain 操作
    let selectResult
    try {
      selectResult = domainSelectTarget(game.currentRound, playerId, targetCardId)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      throw new SelectTargetError('INVALID_SELECTION', message)
    }

    // 7. 更新遊戲狀態
    game = updateRound(game, selectResult.updatedRound)

    // 8. 檢測役種
    const currentDepository = getPlayerDepository(selectResult.updatedRound, playerId)
    const currentYaku = detectYaku(currentDepository, game.ruleset.yaku_settings)
    const newlyFormedYaku = detectNewYaku(previousYaku, currentYaku)

    // 9. 判斷下一步並發佈事件
    if (newlyFormedYaku.length > 0) {
      // 檢查玩家是否還能選擇 Koi-Koi（手牌是否已空）
      const canKoiKoiResult = canPlayerKoiKoi(selectResult.updatedRound, playerId)

      if (canKoiKoiResult) {
        // 有新役種形成且還有手牌，進入決策階段（傳遞 activeYaku 以支援重連恢復）
        const updatedRound = setAwaitingDecision(selectResult.updatedRound, currentYaku)
        game = updateRound(game, updatedRound)

        const yakuUpdate: YakuUpdate = {
          newly_formed_yaku: [...newlyFormedYaku],
          all_active_yaku: [...currentYaku],
        }

        const event = this.eventMapper.toDecisionRequiredEvent(
          game,
          playerId,
          null, // SelectionRequired 已傳遞過 hand_card_play，不重複
          selectResult.drawCardPlay,
          yakuUpdate
        )
        this.eventPublisher.publishToGame(gameId, event)

        // 啟動超時（同一玩家需要決策）
        this.turnFlowService?.startTimeoutForPlayer(gameId, playerId, 'AWAITING_DECISION')
      } else {
        // 最後一手牌形成役種，無法 Koi-Koi，直接結算
        // 先發送 TurnProgressAfterSelection 事件（讓前端顯示最後一手的動畫）
        const yakuUpdate: YakuUpdate = {
          newly_formed_yaku: [...newlyFormedYaku],
          all_active_yaku: [...currentYaku],
        }

        const progressEvent = this.eventMapper.toTurnProgressAfterSelectionEvent(
          game,
          playerId,
          selectResult.selection,
          selectResult.drawCardPlay,
          yakuUpdate
        )
        this.eventPublisher.publishToGame(gameId, progressEvent)

        // 計算局結束結果
        const roundEndResult = calculateRoundEndResult(
          selectResult.updatedRound,
          playerId,
          game.ruleset.yaku_settings
        )

        // 建立倍率資訊（使用 TurnFlowService 的共用方法）
        // 傳入 roundEndResult.isDoubled，讓前端能顯示 7 點翻倍資訊
        const multipliers = this.turnFlowService!.buildMultipliers(game, roundEndResult.isDoubled)

        // 使用 TurnFlowService 處理回合結束（使用新的「局間歸屬上一局尾部」語意）
        // 傳入 includeAnimationDelay=true，因為前端需要先播放 TurnProgressAfterSelection 動畫
        await this.turnFlowService?.handleScoredRoundEnd(
          gameId,
          game,
          playerId,
          roundEndResult,
          multipliers,
          true // includeAnimationDelay: 最後一手形成役種，需等待動畫
        )

        // handleScoredRoundEnd 已處理儲存和事件發送，直接返回
        return { success: true }
      }
    } else {
      // 無新役種，回合完成
      const yakuUpdate: YakuUpdate | null = currentYaku.length > 0
        ? { newly_formed_yaku: [], all_active_yaku: [...currentYaku] }
        : null

      // 建立臨時遊戲狀態來檢查是否應該結束局
      const tempGame = updateRound(game, selectResult.updatedRound)

      // 檢查是否應該結束局（手牌或牌堆耗盡）
      if (shouldEndRound(tempGame)) {
        // 先發送 TurnProgressAfterSelection 事件（讓前端顯示最後一手的動畫）
        const progressEvent = this.eventMapper.toTurnProgressAfterSelectionEvent(
          tempGame,
          playerId,
          selectResult.selection,
          selectResult.drawCardPlay,
          yakuUpdate
        )
        this.eventPublisher.publishToGame(gameId, progressEvent)

        // 流局處理
        if (this.turnFlowService) {
          game = await this.turnFlowService.handleRoundDraw(gameId, tempGame)
        }
      } else {
        // 正常換人
        const updatedRound = advanceToNextPlayer(selectResult.updatedRound)
        game = updateRound(game, updatedRound)

        const event = this.eventMapper.toTurnProgressAfterSelectionEvent(
          game,
          playerId,
          selectResult.selection,
          selectResult.drawCardPlay,
          yakuUpdate
        )
        this.eventPublisher.publishToGame(gameId, event)

        // 啟動下一位玩家的超時
        const nextPlayerId = game.currentRound?.activePlayerId
        if (nextPlayerId) {
          this.turnFlowService?.startTimeoutForPlayer(gameId, nextPlayerId, 'AWAITING_HAND_PLAY')
        }
      }
    }

      // 10. 儲存更新
      this.gameStore.set(game)
      await this.gameRepository.save(game)

      return { success: true }
    }) // end of withLock
  }
}
