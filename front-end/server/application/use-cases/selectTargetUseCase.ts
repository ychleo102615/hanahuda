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
import type { GameStorePort, EventMapperPort } from './joinGameUseCase'
import type { TurnEventMapperPort } from './playHandCardUseCase'

/**
 * 擴展 TurnEventMapperPort 以支援選擇完成事件
 */
export interface SelectionEventMapperPort extends TurnEventMapperPort {
  toTurnProgressAfterSelectionEvent(
    game: Game,
    playerId: string,
    selection: CardSelection,
    drawCardPlay: CardPlay,
    yakuUpdate: YakuUpdate | null
  ): TurnProgressAfterSelectionEvent
}

/**
 * 選擇配對目標輸入參數
 */
export interface SelectTargetInput {
  /** 遊戲 ID */
  readonly gameId: string
  /** 玩家 ID */
  readonly playerId: string
  /** 來源卡片（翻出的卡片） */
  readonly sourceCardId: string
  /** 選擇的配對目標 */
  readonly targetCardId: string
}

/**
 * 選擇配對目標輸出結果
 */
export interface SelectTargetOutput {
  /** 是否成功 */
  readonly success: true
}

/**
 * 選擇配對目標錯誤
 */
export class SelectTargetError extends Error {
  constructor(
    public readonly code: 'WRONG_PLAYER' | 'INVALID_STATE' | 'INVALID_SELECTION' | 'GAME_NOT_FOUND',
    message: string
  ) {
    super(message)
    this.name = 'SelectTargetError'
  }
}

/**
 * SelectTargetUseCase
 *
 * 處理玩家選擇配對目標的完整流程。
 */
export class SelectTargetUseCase {
  constructor(
    private readonly gameRepository: GameRepositoryPort,
    private readonly eventPublisher: EventPublisherPort,
    private readonly gameStore: GameStorePort,
    private readonly eventMapper: SelectionEventMapperPort
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

      // 如果換到 AI，觸發 AI 回合（Phase 5 實作）
      const aiPlayer = getAiPlayer(game)
      if (aiPlayer && game.currentRound?.activePlayerId === aiPlayer.id) {
        // TODO: 觸發 AI 回合（T052-T055 實作）
        console.log(`[SelectTargetUseCase] AI turn triggered for player ${aiPlayer.id}`)
      }
    }

    // 10. 儲存更新
    this.gameStore.set(game)
    await this.gameRepository.save(game)

    console.log(`[SelectTargetUseCase] Player ${playerId} selected target ${targetCardId}`)

    return { success: true }
  }
}
