/**
 * HandleTurnCompletedUseCase
 *
 * @description
 * 處理 TurnCompleted 事件，使用高階動畫 API 觸發卡片配對動畫並更新遊戲狀態。
 *
 * 業務流程：
 * 1. 處理手牌操作（透過 playCardPlaySequence）
 * 2. 處理翻牌操作（透過 playDrawCardSequence）
 * 3. 更新遊戲流程狀態
 * 4. 啟動操作倒數
 * 5. 清理動畫層
 *
 * @see specs/003-ui-application-layer/contracts/events.md#TurnCompletedEvent
 */

import type { TurnCompletedEvent } from '#shared/contracts'
import type { GameStatePort, AnimationPort, NotificationPort } from '../../ports/output'
import type { CardPlayStateCallbacks } from '../../ports/output/animation.port'
import type { HandleTurnCompletedPort, ExecuteOptions } from '../../ports/input'
import type { DomainFacade } from '../../types/domain-facade'
import { AbortOperationError } from '../../types'

export class HandleTurnCompletedUseCase implements HandleTurnCompletedPort {
  constructor(
    private readonly gameState: GameStatePort,
    private readonly animation: AnimationPort,
    private readonly notification: NotificationPort,
    private readonly domainFacade: DomainFacade
  ) {}

  /**
   * 執行回合完成事件處理
   */
  execute(event: TurnCompletedEvent, _options: ExecuteOptions): Promise<void> {
    return this.executeAsync(event)
  }

  /**
   * 非同步執行動畫和狀態更新
   */
  private async executeAsync(event: TurnCompletedEvent): Promise<void> {
    try {
      await this.executeAsyncCore(event)
    } catch (error) {
      if (error instanceof AbortOperationError) {
        console.info('[HandleTurnCompletedUseCase] Aborted due to state recovery')
        return
      }
      throw error
    }
  }

  /**
   * 核心執行邏輯
   */
  private async executeAsyncCore(event: TurnCompletedEvent): Promise<void> {
    const localPlayerId = this.gameState.getLocalPlayerId()
    const isOpponent = event.player_id !== localPlayerId
    const opponentPlayerId = isOpponent ? event.player_id : 'opponent'

    this.notification.cleanup()
    const startTS = new Date()

    // 創建狀態更新回調（供 AnimationPortAdapter 在適當時機調用）
    const callbacks = this.createStateCallbacks(localPlayerId, opponentPlayerId, isOpponent)

    // === 階段 1：處理手牌操作 ===
    if (event.hand_card_play) {
      const firstCapturedCard = event.hand_card_play.captured_cards[0]
      const targetCardType = firstCapturedCard
        ? this.domainFacade.getCardTypeFromId(firstCapturedCard)
        : 'PLAIN'

      await this.animation.playCardPlaySequence(
        {
          playedCard: event.hand_card_play.played_card,
          matchedCard: event.hand_card_play.matched_card,
          capturedCards: event.hand_card_play.captured_cards,
          isOpponent,
          targetCardType,
        },
        callbacks
      )
    }

    // === 階段 2：處理翻牌操作 ===
    if (event.draw_card_play) {
      const firstCapturedCard = event.draw_card_play.captured_cards[0]
      const targetCardType = firstCapturedCard
        ? this.domainFacade.getCardTypeFromId(firstCapturedCard)
        : 'PLAIN'

      await this.animation.playDrawCardSequence(
        {
          drawnCard: event.draw_card_play.played_card,
          matchedCard: event.draw_card_play.matched_card,
          capturedCards: event.draw_card_play.captured_cards,
          isOpponent,
          targetCardType,
        },
        callbacks
      )
    }

    // === 階段 3：更新遊戲流程狀態 ===
    this.gameState.updateDeckRemaining(event.deck_remaining)
    this.gameState.setFlowStage(event.next_state.state_type)
    this.gameState.setActivePlayer(event.next_state.active_player_id)

    // === 階段 4：啟動操作倒數 ===
    const currentTS = new Date()
    const dt = Math.floor((currentTS.getTime() - startTS.getTime()) / 1000)
    this.notification.startActionCountdown(event.action_timeout_seconds - dt)

    // === 階段 5：清理動畫層 ===
    this.animation.clearHiddenCards()
  }

  /**
   * 創建狀態更新回調
   *
   * @description
   * 這些回調會被 AnimationPortAdapter 在動畫流程的適當時機調用，
   * 確保 DOM 更新和動畫執行的正確順序。
   */
  private createStateCallbacks(
    localPlayerId: string,
    opponentPlayerId: string,
    isOpponent: boolean
  ): CardPlayStateCallbacks {
    return {
      onUpdateDepository: (capturedCards: string[]) => {
        const myDepository = [...this.gameState.getDepositoryCards(localPlayerId)]
        const opponentDepository = [...this.gameState.getDepositoryCards(opponentPlayerId)]

        if (isOpponent) {
          this.gameState.updateDepositoryCards(myDepository, [...opponentDepository, ...capturedCards])
        } else {
          this.gameState.updateDepositoryCards([...myDepository, ...capturedCards], opponentDepository)
        }
      },

      onRemoveFieldCards: (cardIds: string[]) => {
        const currentFieldCards = this.gameState.getFieldCards()
        const newFieldCards = currentFieldCards.filter(id => !cardIds.includes(id))
        this.gameState.updateFieldCards(newFieldCards)
      },

      onRemoveHandCard: (cardId: string) => {
        if (!isOpponent) {
          const currentHandCards = this.gameState.getHandCards()
          const newHandCards = currentHandCards.filter(id => id !== cardId)
          this.gameState.updateHandCards(newHandCards)
        } else {
          const currentCount = this.gameState.getOpponentHandCount()
          this.gameState.updateOpponentHandCount(currentCount - 1)
        }
      },

      onAddFieldCards: (cardIds: string[]) => {
        const currentFieldCards = this.gameState.getFieldCards()
        const newFieldCards = [...currentFieldCards, ...cardIds]
        this.gameState.updateFieldCards(newFieldCards)
      },
    }
  }
}
