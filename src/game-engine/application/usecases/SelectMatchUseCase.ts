import type { IEventPublisher } from '../ports/IEventPublisher'
import type { IGameStateRepository } from '../ports/IGameStateRepository'
import { Yaku } from '../../domain/entities/Yaku'
import type { MatchSelectedEvent } from '@/shared/events/game/MatchSelectedEvent'
import type { TurnTransition } from '@/shared/events/base/TurnTransition'
import type { YakuResult } from '@/shared/events/base/YakuResult'
import { v4 as uuidv4 } from 'uuid'

/**
 * SelectMatchInputDTO - 輸入參數
 */
export interface SelectMatchInputDTO {
  /** 遊戲 ID */
  gameId: string
  /** 玩家 ID */
  playerId: string
  /** 來源卡片 ID (通常是手牌或牌堆卡) */
  sourceCardId: string
  /** 選擇的場牌 ID */
  selectedFieldCardId: string
  /** 是否為自動選擇 (逾時) */
  autoSelected?: boolean
}

/**
 * SelectMatchResult - 結果
 */
export interface SelectMatchResult {
  success: boolean
  capturedCardIds?: string[]
  achievedYaku?: YakuResult[]
  turnTransition?: TurnTransition
  error?: string
}

/**
 * Select Match Use Case (Game Engine BC)
 *
 * 處理玩家在多重配對情況下的選擇,或自動選擇 (逾時)。
 *
 * 職責:
 * - 驗證選擇的有效性
 * - 執行卡片捕獲
 * - 檢查達成的役種
 * - 更新遊戲狀態
 * - 發布 MatchSelectedEvent
 */
export class SelectMatchUseCase {
  constructor(
    private gameRepository: IGameStateRepository,
    private eventPublisher: IEventPublisher
  ) {}

  async execute(input: SelectMatchInputDTO): Promise<SelectMatchResult> {
    try {
      // 1. 取得遊戲狀態
      const gameState = await this.gameRepository.getGameState(input.gameId)
      if (!gameState) {
        return {
          success: false,
          error: 'Game not found'
        }
      }

      // 2. 驗證是否為當前玩家
      const currentPlayer = gameState.currentPlayer
      if (!currentPlayer || currentPlayer.id !== input.playerId) {
        return {
          success: false,
          error: 'Not your turn'
        }
      }

      // 3. 驗證來源卡片在場上
      const sourceCard = (gameState as any).field.find((c: any) => c.id === input.sourceCardId)
      if (!sourceCard) {
        return {
          success: false,
          error: 'Source card not found on field'
        }
      }

      // 4. 驗證選擇的場牌存在且可配對
      const selectedCard = (gameState as any).field.find((c: any) => c.id === input.selectedFieldCardId)
      if (!selectedCard) {
        return {
          success: false,
          error: 'Selected field card not found'
        }
      }

      // 5. 驗證配對有效性 (相同花色)
      if (sourceCard.suit !== selectedCard.suit) {
        return {
          success: false,
          error: 'Cards do not match (different suits)'
        }
      }

      // 6. 從場上移除兩張卡片
      const removedCards = gameState.removeFromField([input.sourceCardId, input.selectedFieldCardId])
      if (removedCards.length !== 2) {
        return {
          success: false,
          error: 'Failed to remove cards from field'
        }
      }

      // 7. 將卡片加入玩家的捕獲區
      currentPlayer.addToCaptured(removedCards)

      // 8. 檢查達成的役種
      const yakuResults = Yaku.checkYaku(currentPlayer.captured)
      const achievedYaku: YakuResult[] = yakuResults.map(yaku => ({
        yaku: yaku.yaku.name as any,
        points: yaku.points,
        cardIds: yaku.cards.map(card => card.id)
      }))

      // 9. 決定下一個階段和回合轉換
      let turnTransition: TurnTransition
      const hasYaku = yakuResults.length > 0

      if (hasYaku && currentPlayer.handCount > 0) {
        // 有役種且還有手牌 -> 進入來來階段
        gameState.setPhase('koikoi')
        turnTransition = {
          previousPlayerId: input.playerId,
          currentPlayerId: input.playerId, // 保持當前玩家 (等待來來決策)
          reason: 'match_selected'
        }
      } else if (hasYaku && currentPlayer.handCount === 0) {
        // 有役種但沒有手牌 -> 回合結束
        gameState.setPhase('round_end')
        turnTransition = {
          previousPlayerId: input.playerId,
          currentPlayerId: input.playerId,
          reason: 'match_selected'
        }
      } else {
        // 沒有役種 -> 切換到下一位玩家
        gameState.nextPlayer()
        const nextPlayer = gameState.currentPlayer
        turnTransition = {
          previousPlayerId: input.playerId,
          currentPlayerId: nextPlayer?.id || input.playerId,
          reason: 'card_played'
        }
      }

      // 10. 儲存遊戲狀態
      await this.gameRepository.saveGameState(input.gameId, gameState)

      // 11. 發布 MatchSelectedEvent
      await this.publishMatchSelectedEvent(
        input.playerId,
        input.sourceCardId,
        input.selectedFieldCardId,
        input.autoSelected || false,
        [input.sourceCardId, input.selectedFieldCardId],
        achievedYaku,
        turnTransition
      )

      return {
        success: true,
        capturedCardIds: [input.sourceCardId, input.selectedFieldCardId],
        achievedYaku,
        turnTransition
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * 發布 MatchSelectedEvent 到 game-ui BC
   */
  private async publishMatchSelectedEvent(
    playerId: string,
    sourceCardId: string,
    selectedFieldCardId: string,
    autoSelected: boolean,
    capturedCardIds: string[],
    achievedYaku: YakuResult[],
    turnTransition: TurnTransition
  ): Promise<void> {
    const event: MatchSelectedEvent = {
      eventId: uuidv4(),
      eventType: 'MatchSelected',
      timestamp: Date.now(),
      sequenceNumber: this.eventPublisher.getNextSequenceNumber(),
      playerId,
      sourceCardId,
      selectedFieldCardId,
      autoSelected,
      capturedCardIds,
      achievedYaku,
      turnTransition
    }

    await this.eventPublisher.publishEvent(event)
  }
}
