/**
 * PlayHandCardUseCase - Application Layer
 *
 * @description
 * 處理玩家打出手牌的用例。
 * 執行手牌配對、翻牌、役種檢測，並發佈對應事件。
 *
 * @module server/application/use-cases/playHandCardUseCase
 */

import type { Game } from '~~/server/domain/game/game'
import type {
  GameEvent,
  TurnCompletedEvent,
  SelectionRequiredEvent,
  DecisionRequiredEvent,
  CardPlay,
  YakuUpdate,
  Yaku,
} from '#shared/contracts'
import {
  updateRound,
  getCurrentFlowState,
  isPlayerTurn,
  getAiPlayer,
  getPlayerDepositoryFromGame,
  shouldEndRound,
} from '~~/server/domain/game/game'
import {
  playHandCard as domainPlayHandCard,
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
import type { TurnEventMapperPort } from '~~/server/application/ports/output/eventMapperPort'
import {
  PlayHandCardError,
  type PlayHandCardInputPort,
  type PlayHandCardInput,
  type PlayHandCardOutput,
} from '~~/server/application/ports/input/playHandCardInputPort'
import { gameConfig } from '~~/server/utils/config'

// Re-export for backwards compatibility
export { PlayHandCardError } from '~~/server/application/ports/input/playHandCardInputPort'
export type { TurnEventMapperPort } from '~~/server/application/ports/output/eventMapperPort'

/**
 * PlayHandCardUseCase
 *
 * 處理玩家打出手牌的完整流程。
 */
export class PlayHandCardUseCase implements PlayHandCardInputPort {
  constructor(
    private readonly gameRepository: GameRepositoryPort,
    private readonly eventPublisher: EventPublisherPort,
    private readonly gameStore: GameStorePort,
    private readonly eventMapper: TurnEventMapperPort,
    private readonly actionTimeoutManager?: ActionTimeoutPort,
    private readonly autoActionUseCase?: AutoActionInputPort
  ) {}

  /**
   * 執行打手牌用例
   *
   * @param input - 打手牌參數
   * @returns 結果
   * @throws PlayHandCardError 如果操作無效
   */
  async execute(input: PlayHandCardInput): Promise<PlayHandCardOutput> {
    const { gameId, playerId, cardId, targetCardId } = input

    // 0. 清除當前玩家的超時計時器
    this.actionTimeoutManager?.clearTimeout(`${gameId}:${playerId}`)

    // 1. 取得遊戲狀態
    const existingGame = await this.gameRepository.findById(gameId)
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

    // 5. 執行 Domain 操作
    let playResult
    try {
      playResult = domainPlayHandCard(game.currentRound, playerId, cardId, targetCardId)
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
      this.startTimeoutForPlayer(gameId, playerId, 'AWAITING_SELECTION')
    } else if (playResult.drawCardPlay) {
      // 回合完成，檢查役種
      const currentDepository = getPlayerDepository(playResult.updatedRound, playerId)
      const currentYaku = detectYaku(currentDepository, game.ruleset.yaku_settings)
      const newlyFormedYaku = detectNewYaku(previousYaku, currentYaku)

      if (newlyFormedYaku.length > 0) {
        // 有新役種形成，進入決策階段
        const updatedRound = setAwaitingDecision(playResult.updatedRound)
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
        this.startTimeoutForPlayer(gameId, playerId, 'AWAITING_DECISION')
      } else {
        // 無新役種，回合完成，換人
        const updatedRound = advanceToNextPlayer(playResult.updatedRound)
        game = updateRound(game, updatedRound)

        const event = this.eventMapper.toTurnCompletedEvent(
          game,
          playerId,
          playResult.handCardPlay,
          playResult.drawCardPlay
        )
        this.eventPublisher.publishToGame(gameId, event)

        // 啟動下一位玩家的超時
        const nextPlayerId = game.currentRound?.activePlayerId
        if (nextPlayerId) {
          this.startTimeoutForPlayer(gameId, nextPlayerId, 'AWAITING_HAND_PLAY')
        }
      }
    }

    // 8. 儲存更新
    this.gameStore.set(game)
    await this.gameRepository.save(game)

    console.log(`[PlayHandCardUseCase] Player ${playerId} played card ${cardId}`)

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
        console.log(`[PlayHandCardUseCase] Timeout for player ${playerId} in game ${gameId}, executing auto-action`)
        this.autoActionUseCase!.execute({
          gameId,
          playerId,
          currentFlowState: flowState,
        }).catch((error) => {
          console.error(`[PlayHandCardUseCase] Auto-action failed:`, error)
        })
      }
    )
  }
}
