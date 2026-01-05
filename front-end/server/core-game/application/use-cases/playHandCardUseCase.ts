/**
 * PlayHandCardUseCase - Application Layer
 *
 * @description
 * 處理玩家打出手牌的用例。
 * 執行手牌配對、翻牌、役種檢測，並發佈對應事件。
 *
 * @module server/application/use-cases/playHandCardUseCase
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
  playHandCard as domainPlayHandCard,
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
import type { TurnEventMapperPort } from '~~/server/core-game/application/ports/output/eventMapperPort'
import type { GameLogRepositoryPort } from '~~/server/core-game/application/ports/output/gameLogRepositoryPort'
import type { GameLockPort } from '~~/server/core-game/application/ports/output/gameLockPort'
import { COMMAND_TYPES } from '~~/server/database/schema/gameLogs'
import type { TurnFlowService } from '~~/server/core-game/application/services/turnFlowService'
import type { RecordGameStatsInputPort } from '~~/server/core-game/application/ports/input/recordGameStatsInputPort'
import {
  PlayHandCardError,
  type PlayHandCardInputPort,
  type PlayHandCardInput,
  type PlayHandCardOutput,
} from '~~/server/core-game/application/ports/input/playHandCardInputPort'

// Re-export for backwards compatibility
export { PlayHandCardError } from '~~/server/core-game/application/ports/input/playHandCardInputPort'
export type { TurnEventMapperPort } from '~~/server/core-game/application/ports/output/eventMapperPort'

/**
 * PlayHandCardUseCase
 *
 * 處理玩家打出手牌的完整流程。
 */
export class PlayHandCardUseCase implements PlayHandCardInputPort {
  private turnFlowService?: TurnFlowService

  constructor(
    private readonly gameRepository: GameRepositoryPort,
    private readonly eventPublisher: EventPublisherPort,
    private readonly gameStore: GameStorePort,
    private readonly eventMapper: TurnEventMapperPort,
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
   * 執行打手牌用例
   *
   * @param input - 打手牌參數
   * @returns 結果
   * @throws PlayHandCardError 如果操作無效
   */
  async execute(input: PlayHandCardInput): Promise<PlayHandCardOutput> {
    const { gameId, playerId, cardId, targetCardId, isAutoAction } = input

    // 記錄命令 (Fire-and-Forget) - 在鎖外執行，用於審計
    this.gameLogRepository?.logAsync({
      gameId,
      playerId,
      eventType: COMMAND_TYPES.PlayHandCard,
      payload: { cardId, targetCardId },
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
        throw new PlayHandCardError('GAME_NOT_FOUND', `Game not found: ${gameId}`)
      }

      let game = existingGame

    // 2. 驗證玩家回合
    if (!isPlayerTurn(game, playerId)) {
      throw new PlayHandCardError('WRONG_PLAYER', `Not player's turn: ${playerId}`)
    }

    // 3. 驗證流程狀態
    const flowState = getCurrentFlowState(game)
    if (flowState !== 'AWAITING_HAND_PLAY') {
      throw new PlayHandCardError('INVALID_STATE', `Invalid flow state: ${flowState}`)
    }

    if (!game.currentRound) {
      throw new PlayHandCardError('INVALID_STATE', 'No current round')
    }

    // 4. 取得操作前的役種
    const previousDepository = getPlayerDepository(game.currentRound, playerId)
    const previousYaku = detectYaku(previousDepository, game.ruleset.yaku_settings)

    // 5. 執行 Domain 操作（傳入 previousYaku 供 pendingSelection 使用）
    let playResult
    try {
      playResult = domainPlayHandCard(game.currentRound, playerId, cardId, {
        handTargetCardId: targetCardId,
        previousYaku,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      if (message.includes('Card not in hand')) {
        throw new PlayHandCardError('INVALID_CARD', message)
      }
      if (message.includes('Invalid') && message.includes('target')) {
        throw new PlayHandCardError('INVALID_TARGET', message)
      }
      throw new PlayHandCardError('INVALID_STATE', message)
    }

    // 6. 更新遊戲狀態
    game = updateRound(game, playResult.updatedRound)

    // 7. 判斷下一步並發佈事件
    if (playResult.needsSelection && playResult.selectionInfo) {
      // 需要選擇配對目標
      const event = this.eventMapper.toSelectionRequiredEvent(
        game,
        playerId,
        playResult.handCardPlay,
        playResult.selectionInfo.drawnCard,
        playResult.selectionInfo.possibleTargets
      )
      this.eventPublisher.publishToGame(gameId, event)

      // 啟動超時（同一玩家需要選擇）
      this.turnFlowService?.startTimeoutForPlayer(gameId, playerId, 'AWAITING_SELECTION')
    } else if (playResult.drawCardPlay) {
      // 回合完成，檢查役種
      const currentDepository = getPlayerDepository(playResult.updatedRound, playerId)
      const currentYaku = detectYaku(currentDepository, game.ruleset.yaku_settings)
      const newlyFormedYaku = detectNewYaku(previousYaku, currentYaku)

      if (newlyFormedYaku.length > 0) {
        // 檢查玩家是否還能選擇 Koi-Koi（手牌是否已空）
        const canKoiKoiResult = canPlayerKoiKoi(playResult.updatedRound, playerId)

        if (canKoiKoiResult) {
          // 有新役種形成且還有手牌，進入決策階段（傳遞 activeYaku 以支援重連恢復）
          const updatedRound = setAwaitingDecision(playResult.updatedRound, currentYaku)
          game = updateRound(game, updatedRound)

          const yakuUpdate: YakuUpdate = {
            newly_formed_yaku: [...newlyFormedYaku],
            all_active_yaku: [...currentYaku],
          }

          const event = this.eventMapper.toDecisionRequiredEvent(
            game,
            playerId,
            playResult.handCardPlay,
            playResult.drawCardPlay,
            yakuUpdate
          )
          this.eventPublisher.publishToGame(gameId, event)

          // 啟動超時（同一玩家需要決策）
          this.turnFlowService?.startTimeoutForPlayer(gameId, playerId, 'AWAITING_DECISION')
        } else {
          // 最後一手牌形成役種，無法 Koi-Koi，直接結算
          // 先發送 TurnCompleted 事件（讓前端顯示最後一手的動畫）
          const turnEvent = this.eventMapper.toTurnCompletedEvent(
            game,
            playerId,
            playResult.handCardPlay,
            playResult.drawCardPlay
          )
          this.eventPublisher.publishToGame(gameId, turnEvent)

          // 計算局結束結果
          const roundEndResult = calculateRoundEndResult(
            playResult.updatedRound,
            playerId,
            game.ruleset.yaku_settings
          )

          // 建立倍率資訊（使用 TurnFlowService 的共用方法）
          // 傳入 roundEndResult.isDoubled，讓前端能顯示 7 點翻倍資訊
          const multipliers = this.turnFlowService!.buildMultipliers(game, roundEndResult.isDoubled)

          // 使用 TurnFlowService 處理回合結束（使用新的「局間歸屬上一局尾部」語意）
          // 傳入 includeAnimationDelay=true，因為前端需要先播放 TurnCompleted 動畫
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
        // 先建立臨時遊戲狀態來檢查是否應該結束局
        const tempGame = updateRound(game, playResult.updatedRound)

        // 檢查是否應該結束局（手牌或牌堆耗盡）
        if (shouldEndRound(tempGame)) {
          // 先發送 TurnCompleted 事件（讓前端顯示最後一手的動畫）
          // 使用 tempGame 因為需要正確的場牌狀態
          const turnEvent = this.eventMapper.toTurnCompletedEvent(
            tempGame,
            playerId,
            playResult.handCardPlay,
            playResult.drawCardPlay!
          )
          this.eventPublisher.publishToGame(gameId, turnEvent)

          // 流局處理
          if (this.turnFlowService) {
            game = await this.turnFlowService.handleRoundDraw(gameId, tempGame)
          }
        } else {
          // 正常換人
          const updatedRound = advanceToNextPlayer(playResult.updatedRound)
          game = updateRound(game, updatedRound)

          const event = this.eventMapper.toTurnCompletedEvent(
            game,
            playerId,
            playResult.handCardPlay,
            playResult.drawCardPlay!
          )
          this.eventPublisher.publishToGame(gameId, event)

          // 啟動下一位玩家的超時
          const nextPlayerId = game.currentRound?.activePlayerId
          if (nextPlayerId) {
            this.turnFlowService?.startTimeoutForPlayer(gameId, nextPlayerId, 'AWAITING_HAND_PLAY')
          }
        }
      }
    }

      // 8. 儲存更新
      this.gameStore.set(game)
      await this.gameRepository.save(game)

      return { success: true }
    }) // end of withLock
  }
}
