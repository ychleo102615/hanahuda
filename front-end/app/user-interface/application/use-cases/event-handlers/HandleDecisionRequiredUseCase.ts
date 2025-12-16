/**
 * HandleDecisionRequiredUseCase
 *
 * @description
 * 處理 DecisionRequired 事件（形成役種，需決策），使用高階動畫 API 播放動畫並顯示 Koi-Koi 決策 Modal。
 *
 * 業務流程：
 * 1. 處理手牌操作（透過 playCardPlaySequence）
 * 2. 處理翻牌操作（透過 playDrawCardSequence）
 * 3. 更新遊戲狀態
 * 4. 計算役種得分並顯示決策 Modal
 * 5. 更新 FlowStage 為 AWAITING_DECISION
 *
 * @see specs/003-ui-application-layer/contracts/events.md#DecisionRequiredEvent
 */

import type { DecisionRequiredEvent } from '#shared/contracts'
import type { UIStatePort, NotificationPort, GameStatePort, AnimationPort } from '../../ports/output'
import type { CardPlayStateCallbacks } from '../../ports/output/animation.port'
import type { DomainFacade } from '../../types/domain-facade'
import type { HandleDecisionRequiredPort } from '../../ports/input'
import { AbortOperationError } from '../../types'

export class HandleDecisionRequiredUseCase implements HandleDecisionRequiredPort {
  constructor(
    private readonly updateUIState: UIStatePort,
    private readonly notification: NotificationPort,
    private readonly domainFacade: DomainFacade,
    private readonly gameState: GameStatePort,
    private readonly animation: AnimationPort
  ) {}

  execute(event: DecisionRequiredEvent, signal?: AbortSignal): Promise<void> {
    return this.executeAsync(event, signal)
  }

  private async executeAsync(event: DecisionRequiredEvent, signal?: AbortSignal): Promise<void> {
    try {
      await this.executeAsyncCore(event, signal)
    } catch (error) {
      if (error instanceof AbortOperationError) {
        console.info('[HandleDecisionRequiredUseCase] Aborted due to state recovery')
        return
      }
      throw error
    }
  }

  /**
   * 核心執行邏輯（可被中斷）
   */
  private async executeAsyncCore(event: DecisionRequiredEvent, signal?: AbortSignal): Promise<void> {
    // 記錄動畫開始時間（用於計算動畫耗時）
    const startTS = new Date()

    const localPlayerId = this.gameState.getLocalPlayerId()
    const isOpponent = event.player_id !== localPlayerId
    const opponentPlayerId = isOpponent ? event.player_id : 'opponent'

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

    // === 階段 3：更新遊戲狀態 ===
    this.gameState.updateDeckRemaining(event.deck_remaining)
    this.gameState.setActivePlayer(event.player_id)

    // === 階段 4：清理動畫層 ===
    this.animation.clearHiddenCards()

    // === 階段 5：計算役種得分並顯示 Modal ===
    const isMyTurn = event.player_id === localPlayerId
    const currentScore = event.yaku_update.all_active_yaku.reduce(
      (sum, yaku) => sum + yaku.base_points,
      0
    )
    const multiplier = event.current_multipliers.player_multipliers[event.player_id] || 1
    const finalScore = currentScore * multiplier

    if (isMyTurn) {
      this.notification.showDecisionModal(
        [...event.yaku_update.all_active_yaku],
        finalScore
      )
      // 啟動操作倒數（扣除動畫耗時）
      const currentTS = new Date()
      const dt = Math.floor((currentTS.getTime() - startTS.getTime()) / 1000)
      this.notification.startDisplayCountdown(event.action_timeout_seconds - dt)
    }

    // === 階段 6：更新 FlowStage ===
    this.updateUIState.setFlowStage('AWAITING_DECISION')
  }

  /**
   * 創建狀態更新回調
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
