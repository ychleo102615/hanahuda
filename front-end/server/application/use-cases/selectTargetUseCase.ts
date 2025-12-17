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
  ScoreMultipliers,
} from '#shared/contracts'
import {
  updateRound,
  getCurrentFlowState,
  isPlayerTurn,
  shouldEndRound,
  type Game,
} from '~~/server/domain/game'
import {
  selectTarget as domainSelectTarget,
  advanceToNextPlayer,
  setAwaitingDecision,
  getPlayerDepository,
  canPlayerKoiKoi,
  calculateRoundEndResult,
} from '~~/server/domain/round'
import {
  transitionAfterRoundScored,
} from '~~/server/domain/services/roundTransitionService'
import { gameConfig } from '~~/server/utils/config'
import {
  detectYaku,
  detectNewYaku,
} from '~~/server/domain/services/yakuDetectionService'
import type { GameRepositoryPort } from '~~/server/application/ports/output/gameRepositoryPort'
import type { EventPublisherPort } from '~~/server/application/ports/output/eventPublisherPort'
import type { GameTimeoutPort } from '~~/server/application/ports/output/gameTimeoutPort'
import type { GameStorePort } from '~~/server/application/ports/output/gameStorePort'
import type { SelectionEventMapperPort } from '~~/server/application/ports/output/eventMapperPort'
import type { TurnFlowService } from '~~/server/application/services/turnFlowService'
import {
  SelectTargetError,
  type SelectTargetInputPort,
  type SelectTargetInput,
  type SelectTargetOutput,
} from '~~/server/application/ports/input/selectTargetInputPort'

// Re-export for backwards compatibility
export { SelectTargetError } from '~~/server/application/ports/input/selectTargetInputPort'
export type { SelectionEventMapperPort } from '~~/server/application/ports/output/eventMapperPort'

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
    private readonly gameTimeoutManager?: GameTimeoutPort
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

    // 0. 清除當前遊戲的超時計時器
    this.gameTimeoutManager?.clearTimeout(gameId)

    // 0.1 若為玩家主動操作，重置閒置計時器
    if (!isAutoAction) {
      this.gameTimeoutManager?.resetIdleTimeout(gameId, playerId)
    }

    // 1. 取得遊戲狀態（從記憶體讀取，因為 currentRound 不儲存於 DB）
    const existingGame = this.gameStore.get(gameId)
    if (!existingGame) {
      throw new SelectTargetError('GAME_NOT_FOUND', `Game not found: ${gameId}`)
    }

    // 樂觀鎖：記住讀取時的版本
    const oldVersion = existingGame.currentRound?.version

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

        // 建立倍率資訊
        const multipliers = this.buildMultipliers(existingGame)

        // 處理局轉換
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
        if (this.turnFlowService?.checkAndHandleDisconnectedPlayers(gameId, game)) {
          // 已處理遊戲結束，儲存後直接返回
          // 樂觀鎖檢查
          const currentGame = this.gameStore.get(gameId)
          if (currentGame?.currentRound?.version !== oldVersion) {
            throw new SelectTargetError('VERSION_CONFLICT', 'Concurrent modification detected')
          }
          this.gameStore.set(game)
          await this.gameRepository.save(game)
          console.log(`[SelectTargetUseCase] Game ended due to disconnected player`)
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
          // 遊戲結束
          const winner = transitionResult.winner
          if (winner) {
            // 清除遊戲的所有計時器
            this.gameTimeoutManager?.clearAllForGame(gameId)

            const gameFinishedEvent = this.eventMapper.toGameFinishedEvent(
              winner.winnerId,
              winner.finalScores,
              'NORMAL'
            )
            this.eventPublisher.publishToGame(gameId, gameFinishedEvent)
          }
        }
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
    // 樂觀鎖檢查
    const currentGame = this.gameStore.get(gameId)
    if (currentGame?.currentRound?.version !== oldVersion) {
      throw new SelectTargetError('VERSION_CONFLICT', 'Concurrent modification detected')
    }
    this.gameStore.set(game)
    await this.gameRepository.save(game)

    console.log(`[SelectTargetUseCase] Player ${playerId} selected target ${targetCardId}`)

    return { success: true }
  }

  /**
   * 建立倍率資訊
   *
   * 新規則：只要有任一方宣告過 Koi-Koi，分數就 ×2（全局共享）。
   */
  private buildMultipliers(game: Game): ScoreMultipliers {
    if (!game.currentRound) {
      return { player_multipliers: {}, koi_koi_applied: false }
    }

    // 檢查是否有任一玩家宣告過 Koi-Koi
    const koiKoiApplied = game.currentRound.koiStatuses.some(
      status => status.times_continued > 0
    )
    const multiplier = koiKoiApplied ? 2 : 1

    // 所有玩家使用相同的倍率
    const playerMultipliers: Record<string, number> = {}
    for (const koiStatus of game.currentRound.koiStatuses) {
      playerMultipliers[koiStatus.player_id] = multiplier
    }

    return { player_multipliers: playerMultipliers, koi_koi_applied: koiKoiApplied }
  }
}
