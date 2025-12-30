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
import { deriveCapturedCards } from '#shared/contracts'
import type { UIStatePort, NotificationPort, GameStatePort, AnimationPort } from '../../ports/output'
import type { CardPlayStateCallbacks } from '../../ports/output/animation.port'
import type { DomainFacade } from '../../types/domain-facade'
import type { HandleDecisionRequiredPort, ExecuteOptions } from '../../ports/input'
import { AbortOperationError } from '../../types'
import { getYakuInfo } from '../../../domain/yaku-info'

export class HandleDecisionRequiredUseCase implements HandleDecisionRequiredPort {
  constructor(
    private readonly updateUIState: UIStatePort,
    private readonly notification: NotificationPort,
    private readonly domainFacade: DomainFacade,
    private readonly gameState: GameStatePort,
    private readonly animation: AnimationPort
  ) {}

  execute(event: DecisionRequiredEvent, options: ExecuteOptions): Promise<void> {
    return this.executeAsync(event, options.receivedAt)
  }

  private async executeAsync(event: DecisionRequiredEvent, receivedAt: number): Promise<void> {
    try {
      await this.executeAsyncCore(event, receivedAt)
    } catch (error) {
      if (error instanceof AbortOperationError) {
        return
      }
      throw error
    }
  }

  /**
   * 核心執行邏輯
   */
  private async executeAsyncCore(event: DecisionRequiredEvent, receivedAt: number): Promise<void> {

    const localPlayerId = this.gameState.getLocalPlayerId()
    const isOpponent = event.player_id !== localPlayerId
    const opponentPlayerId = isOpponent ? event.player_id : 'opponent'

    // 創建狀態更新回調（供 AnimationPortAdapter 在適當時機調用）
    const callbacks = this.createStateCallbacks(localPlayerId, opponentPlayerId, isOpponent)

    // === 階段 1：處理手牌操作 ===
    if (event.hand_card_play) {
      const handCapturedCards = deriveCapturedCards(
        event.hand_card_play.played_card,
        event.hand_card_play.matched_cards
      )
      const handMatchedCard = event.hand_card_play.matched_cards[0] ?? null
      const targetCardType = handCapturedCards[0]
        ? this.domainFacade.getCardTypeFromId(handCapturedCards[0])
        : 'PLAIN'

      await this.animation.playCardPlaySequence(
        {
          playedCard: event.hand_card_play.played_card,
          matchedCard: handMatchedCard,
          capturedCards: [...handCapturedCards],
          isOpponent,
          targetCardType,
        },
        callbacks
      )
    }

    // === 階段 2：處理翻牌操作 ===
    if (event.draw_card_play) {
      const drawCapturedCards = deriveCapturedCards(
        event.draw_card_play.played_card,
        event.draw_card_play.matched_cards
      )
      const drawMatchedCard = event.draw_card_play.matched_cards[0] ?? null
      const targetCardType = drawCapturedCards[0]
        ? this.domainFacade.getCardTypeFromId(drawCapturedCards[0])
        : 'PLAIN'

      await this.animation.playDrawCardSequence(
        {
          drawnCard: event.draw_card_play.played_card,
          matchedCard: drawMatchedCard,
          capturedCards: [...drawCapturedCards],
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
    const multiplier = event.current_multipliers.koi_koi_applied ? 2 : 1
    const finalScore = currentScore * multiplier

    if (isMyTurn) {
      this.notification.showDecisionModal(
        [...event.yaku_update.all_active_yaku],
        finalScore
      )
      // 啟動操作倒數（從事件接收時間計算，確保與後端同步）
      const dt = Math.ceil((Date.now() - receivedAt) / 1000)
      this.notification.startCountdown(event.timeout_seconds - dt, 'DISPLAY')
    } else {
      // === 對手獲得役種：同時顯示所有新形成的役種 ===
      const yakuList = event.yaku_update.newly_formed_yaku
        .map(yaku => {
          const yakuInfo = getYakuInfo(yaku.yaku_type)
          if (!yakuInfo) return null
          return {
            yakuType: yaku.yaku_type,
            yakuName: yakuInfo.name,
            yakuNameJa: yakuInfo.nameJa,
            category: yakuInfo.category,
          }
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)

      if (yakuList.length > 0) {
        this.notification.showOpponentYakuAnnouncement(yakuList)
      }
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
