/**
 * AutoActionUseCase - Application Layer
 *
 * @description
 * 處理操作超時時的自動代管操作。
 * 採用「最小影響策略」：
 * - 打牌：選最低價值卡（カス > 短冊 > 種札 > 光札）
 * - 選擇配對：選擇第一個有效目標
 * - 決策：永遠選擇 END_ROUND
 *
 * Server 中立原則：
 * - Core Game BC 不區分玩家類型（人類或 AI）
 * - 超時機制對所有玩家一視同仁
 *
 * @module server/application/use-cases/autoActionUseCase
 */

import type { FlowState } from '#shared/contracts'
import type { Game } from '~~/server/domain/game/game'
import { getPlayerHand } from '~~/server/domain/round/round'
import {
  HIKARI_CARDS,
  TANE_CARDS,
  TANZAKU_CARDS,
  KASU_CARDS,
} from '~~/server/domain/services/yakuDetectionService'
import type { PlayHandCardInputPort } from '~~/server/application/ports/input/playHandCardInputPort'
import type { SelectTargetInputPort } from '~~/server/application/ports/input/selectTargetInputPort'
import type { MakeDecisionInputPort } from '~~/server/application/ports/input/makeDecisionInputPort'
import type {
  AutoActionInputPort,
  AutoActionInput,
} from '~~/server/application/ports/input/autoActionInputPort'
import type { GameStorePort } from '~~/server/application/ports/output/gameStorePort'

/**
 * 卡片價值等級（數值越低，價值越低，越優先被打出）
 */
const CARD_VALUE_RANK = {
  KASU: 1,     // かす - 最低價值
  TANZAKU: 2,  // 短冊
  TANE: 3,     // 種牌
  HIKARI: 4,   // 光牌 - 最高價值
} as const

/**
 * AutoActionUseCase
 *
 * 處理操作超時時的自動代管操作。
 */
export class AutoActionUseCase implements AutoActionInputPort {
  constructor(
    private readonly gameStore: GameStorePort,
    private readonly playHandCardUseCase: PlayHandCardInputPort,
    private readonly selectTargetUseCase: SelectTargetInputPort,
    private readonly makeDecisionUseCase: MakeDecisionInputPort
  ) {}

  /**
   * 執行自動操作
   *
   * @param input - 自動操作參數
   */
  async execute(input: AutoActionInput): Promise<void> {
    const { gameId, playerId, currentFlowState } = input

    console.log(`[AutoActionUseCase] Executing auto-action for player ${playerId} in game ${gameId}, state: ${currentFlowState}`)

    try {
      switch (currentFlowState) {
        case 'AWAITING_HAND_PLAY':
          await this.autoPlayHandCard(gameId, playerId)
          break
        case 'AWAITING_SELECTION':
          await this.autoSelectTarget(gameId, playerId)
          break
        case 'AWAITING_DECISION':
          await this.autoMakeDecision(gameId, playerId)
          break
        default:
          console.warn(`[AutoActionUseCase] Unexpected flow state: ${currentFlowState}`)
      }
    } catch (error) {
      console.error(`[AutoActionUseCase] Error executing auto-action:`, error)
      throw error
    }
  }

  /**
   * 自動打出手牌
   *
   * 策略：選擇最低價值的卡片（カス > 短冊 > 種札 > 光札）
   */
  private async autoPlayHandCard(gameId: string, playerId: string): Promise<void> {
    const game = this.gameStore.get(gameId)
    if (!game || !game.currentRound) {
      throw new Error(`Game or round not found: ${gameId}`)
    }

    const hand = getPlayerHand(game.currentRound, playerId)
    if (hand.length === 0) {
      throw new Error(`Player ${playerId} has no cards in hand`)
    }

    // 選擇最低價值的卡片
    const cardToPlay = this.selectLowestValueCard([...hand])

    console.log(`[AutoActionUseCase] Auto-playing card ${cardToPlay} for player ${playerId}`)

    await this.playHandCardUseCase.execute({
      gameId,
      playerId,
      cardId: cardToPlay,
    })
  }

  /**
   * 自動選擇配對目標
   *
   * 策略：選擇第一個有效目標
   */
  private async autoSelectTarget(gameId: string, playerId: string): Promise<void> {
    const game = this.gameStore.get(gameId)
    if (!game || !game.currentRound) {
      throw new Error(`Game or round not found: ${gameId}`)
    }

    const pendingSelection = game.currentRound.pendingSelection
    if (!pendingSelection) {
      throw new Error('No pending selection')
    }

    // 選擇第一個有效目標
    const targetCard = pendingSelection.possibleTargets[0]
    if (!targetCard) {
      throw new Error('No possible targets')
    }

    console.log(`[AutoActionUseCase] Auto-selecting target ${targetCard} for player ${playerId}`)

    await this.selectTargetUseCase.execute({
      gameId,
      playerId,
      sourceCardId: pendingSelection.drawnCard,
      targetCardId: targetCard,
    })
  }

  /**
   * 自動做出決策
   *
   * 策略：永遠選擇 END_ROUND（不繼續 Koi-Koi）
   */
  private async autoMakeDecision(gameId: string, playerId: string): Promise<void> {
    console.log(`[AutoActionUseCase] Auto-making decision END_ROUND for player ${playerId}`)

    await this.makeDecisionUseCase.execute({
      gameId,
      playerId,
      decision: 'END_ROUND',
    })
  }

  /**
   * 選擇最低價值的卡片
   *
   * 優先順序：カス > 短冊 > 種札 > 光札
   *
   * @param hand - 手牌列表
   * @returns 要打出的卡片 ID
   */
  private selectLowestValueCard(hand: string[]): string {
    // 按價值排序（最低價值在前）
    const sortedHand = hand.sort((a, b) => {
      const rankA = this.getCardValueRank(a)
      const rankB = this.getCardValueRank(b)
      return rankA - rankB
    })

    const selected = sortedHand[0]
    if (!selected) {
      throw new Error('Hand is empty')
    }

    return selected
  }

  /**
   * 取得卡片價值等級
   *
   * @param cardId - 卡片 ID
   * @returns 價值等級（數值越低，價值越低）
   */
  private getCardValueRank(cardId: string): number {
    if (KASU_CARDS.includes(cardId)) {
      return CARD_VALUE_RANK.KASU
    }
    if (TANZAKU_CARDS.includes(cardId)) {
      return CARD_VALUE_RANK.TANZAKU
    }
    if (TANE_CARDS.includes(cardId)) {
      return CARD_VALUE_RANK.TANE
    }
    if (HIKARI_CARDS.includes(cardId)) {
      return CARD_VALUE_RANK.HIKARI
    }
    // 未知類型，視為中等價值
    return CARD_VALUE_RANK.TANZAKU
  }
}
