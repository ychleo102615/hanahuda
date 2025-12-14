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
  shouldEndRound,
  type Game,
} from '~~/server/domain/game/game'
import {
  transitionAfterRoundDraw,
} from '~~/server/domain/services/roundTransitionService'
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
import type { GameTimeoutPort } from '~~/server/application/ports/output/gameTimeoutPort'
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
    private readonly gameTimeoutManager?: GameTimeoutPort,
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

    // 0. 清除當前遊戲的超時計時器
    this.gameTimeoutManager?.clearTimeout(gameId)

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
      // 有新役種形成，進入決策階段（傳遞 activeYaku 以支援重連恢復）
      const updatedRound = setAwaitingDecision(selectResult.updatedRound, currentYaku)
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
        game = await this.handleRoundDraw(gameId, tempGame)
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
          this.startTimeoutForPlayer(gameId, nextPlayerId, 'AWAITING_HAND_PLAY')
        }
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
    if (!this.gameTimeoutManager || !this.autoActionUseCase) {
      return
    }

    this.gameTimeoutManager.startTimeout(
      gameId,
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

  /**
   * 處理流局（牌堆或手牌耗盡且無役種）
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

    // 儲存更新（在此方法內儲存，因為 displayTimeout 回調需要正確狀態）
    this.gameStore.set(updatedGame)
    await this.gameRepository.save(updatedGame)

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
}
