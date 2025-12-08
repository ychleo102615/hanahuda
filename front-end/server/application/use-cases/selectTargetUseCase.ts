/**
 * SelectTargetUseCase - Application Layer
 *
 * @description
 * 處理玩家選擇配對目標的用例（雙重配對時）。
 * 執行配對、役種檢測，並發佈對應事件。
 *
 * @module server/application/use-cases/selectTargetUseCase
 */

import type { Game } from '~~/server/domain/game/game'
import type {
  TurnProgressAfterSelectionEvent,
  DecisionRequiredEvent,
  CardSelection,
  CardPlay,
  YakuUpdate,
} from '#shared/contracts'
import {
  updateRound,
  getCurrentFlowState,
  isPlayerTurn,
  getAiPlayer,
} from '~~/server/domain/game/game'
import {
  selectTarget as domainSelectTarget,
  advanceToNextPlayer,
  setAwaitingDecision,
  getPlayerDepository,
} from '~~/server/domain/round/round'
import {
  detectYaku,
  detectNewYaku,
} from '~~/server/domain/services/yakuDetectionService'
import type { GameRepositoryPort } from '~~/server/application/ports/output/gameRepositoryPort'
import type { EventPublisherPort } from '~~/server/application/ports/output/eventPublisherPort'
import type { ActionTimeoutPort } from '~~/server/application/ports/output/actionTimeoutPort'
import type { AutoActionInputPort } from '~~/server/application/ports/input/autoActionInputPort'
import type { GameStorePort } from '~~/server/application/ports/output/gameStorePort'
import type { SelectionEventMapperPort } from '~~/server/application/ports/output/eventMapperPort'
import {
  SelectTargetError,
  type SelectTargetInputPort,
  type SelectTargetInput,
  type SelectTargetOutput,
} from '~~/server/application/ports/input/selectTargetInputPort'
import { gameConfig } from '~~/server/utils/config'

// Re-export for backwards compatibility
export { SelectTargetError } from '~~/server/application/ports/input/selectTargetInputPort'
export type { SelectionEventMapperPort } from '~~/server/application/ports/output/eventMapperPort'

/**
 * SelectTargetUseCase
 *
 * 處理玩家選擇配對目標的完整流程。
 */
export class SelectTargetUseCase implements SelectTargetInputPort {
  constructor(
    private readonly gameRepository: GameRepositoryPort,
    private readonly eventPublisher: EventPublisherPort,
    private readonly gameStore: GameStorePort,
    private readonly eventMapper: SelectionEventMapperPort,
    private readonly actionTimeoutManager?: ActionTimeoutPort,
    private readonly autoActionUseCase?: AutoActionInputPort
  ) {}

  /**
   * 執行選擇配對目標用例
   *
   * @param input - 選擇參數
   * @returns 結果
   * @throws SelectTargetError 如果操作無效
   */
  async execute(input: SelectTargetInput): Promise<SelectTargetOutput> {
    const { gameId, playerId, sourceCardId, targetCardId } = input

    // 0. 清除當前玩家的超時計時器
    this.actionTimeoutManager?.clearTimeout(`${gameId}:${playerId}`)

    // 1. 取得遊戲狀態
    const existingGame = await this.gameRepository.findById(gameId)
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

    // 5. 取得操作前的役種（包含手牌階段捕獲的）
    const previousDepository = getPlayerDepository(game.currentRound, playerId)
    const previousYaku = detectYaku(previousDepository, game.ruleset.yaku_settings)

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
      // 有新役種形成，進入決策階段
      const updatedRound = setAwaitingDecision(selectResult.updatedRound)
      game = updateRound(game, updatedRound)

      const yakuUpdate: YakuUpdate = {
        newly_formed_yaku: [...newlyFormedYaku],
        all_active_yaku: [...currentYaku],
      }

      const event = this.eventMapper.toDecisionRequiredEvent(
        game,
        playerId,
        pending.handCardPlay, // 使用之前儲存的手牌操作
        selectResult.drawCardPlay,
        yakuUpdate
      )
      this.eventPublisher.publishToGame(gameId, event)

      // 啟動超時（同一玩家需要決策）
      this.startTimeoutForPlayer(gameId, playerId, 'AWAITING_DECISION')
    } else {
      // 無新役種，回合完成，換人
      const updatedRound = advanceToNextPlayer(selectResult.updatedRound)
      game = updateRound(game, updatedRound)

      const yakuUpdate: YakuUpdate | null = currentYaku.length > 0
        ? { newly_formed_yaku: [], all_active_yaku: [...currentYaku] }
        : null

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
        this.startTimeoutForPlayer(gameId, nextPlayerId, 'AWAITING_HAND_PLAY')
      }
    }

    // 10. 儲存更新
    this.gameStore.set(game)
    await this.gameRepository.save(game)

    console.log(`[SelectTargetUseCase] Player ${playerId} selected target ${targetCardId}`)

    return { success: true }
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
    if (!this.actionTimeoutManager || !this.autoActionUseCase) {
      return
    }

    const key = `${gameId}:${playerId}`
    this.actionTimeoutManager.startTimeout(
      key,
      gameConfig.action_timeout_seconds,
      () => {
        console.log(`[SelectTargetUseCase] Timeout for player ${playerId} in game ${gameId}, executing auto-action`)
        this.autoActionUseCase!.execute({
          gameId,
          playerId,
          currentFlowState: flowState,
        }).catch((error) => {
          console.error(`[SelectTargetUseCase] Auto-action failed:`, error)
        })
      }
    )
  }
}
