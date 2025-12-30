/**
 * HandleSelectionRequiredUseCase
 *
 * @description
 * 處理 SelectionRequired 事件（翻牌雙重配對），使用高階動畫 API 觸發動畫並更新遊戲狀態。
 *
 * 業務流程：
 * 1. 處理手牌操作（透過 playCardPlaySequence）
 * 2. 播放翻牌動畫（翻牌飛到場上，但不配對）
 * 3. 保存翻出卡片與可配對目標
 * 4. 設定 AWAITING_SELECTION 狀態
 * 5. 清理動畫層
 *
 * @see specs/003-ui-application-layer/contracts/events.md#SelectionRequiredEvent
 */

import type { SelectionRequiredEvent } from '#shared/contracts'
import { deriveCapturedCards } from '#shared/contracts'
import type { GameStatePort, AnimationPort, NotificationPort } from '../../ports/output'
import type { CardPlayStateCallbacks } from '../../ports/output/animation.port'
import type { DomainFacade } from '../../types/domain-facade'
import type { HandleSelectionRequiredPort, ExecuteOptions } from '../../ports/input'
import { AbortOperationError } from '../../types'
import { waitForLayout } from '../../../adapter/abort'

export class HandleSelectionRequiredUseCase implements HandleSelectionRequiredPort {
  constructor(
    private readonly gameState: GameStatePort,
    private readonly animation: AnimationPort,
    private readonly domainFacade: DomainFacade,
    private readonly notification: NotificationPort
  ) {}

  execute(event: SelectionRequiredEvent, options: ExecuteOptions): Promise<void> {
    return this.executeAsync(event, options.receivedAt)
  }

  /**
   * 非同步執行動畫和狀態更新
   */
  private async executeAsync(event: SelectionRequiredEvent, receivedAt: number): Promise<void> {
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
  private async executeAsyncCore(event: SelectionRequiredEvent, receivedAt: number): Promise<void> {

    const localPlayerId = this.gameState.getLocalPlayerId()
    const isOpponent = event.player_id !== localPlayerId
    const opponentPlayerId = isOpponent ? event.player_id : 'opponent'

    const handCardPlay = event.hand_card_play

    // 創建狀態更新回調（供 AnimationPortAdapter 在適當時機調用）
    const callbacks = this.createStateCallbacks(localPlayerId, opponentPlayerId, isOpponent)

    // === 階段 1：處理手牌操作 ===
    const handCapturedCards = deriveCapturedCards(
      handCardPlay.played_card,
      handCardPlay.matched_cards
    )
    const handMatchedCard = handCardPlay.matched_cards[0] ?? null
    const targetCardType = handCapturedCards[0]
      ? this.domainFacade.getCardTypeFromId(handCapturedCards[0])
      : 'PLAIN'

    await this.animation.playCardPlaySequence(
      {
        playedCard: handCardPlay.played_card,
        matchedCard: handMatchedCard,
        capturedCards: [...handCapturedCards],
        isOpponent,
        targetCardType,
      },
      callbacks
    )

    // === 階段 2：處理翻牌動畫（只翻牌到場上，不配對）===
    // 預先隱藏翻出的牌（避免閃現）
    this.animation.hideCards([event.drawn_card])

    // 加入場牌（渲染時已是 invisible 狀態）
    // 注意：先檢查是否已存在，避免狀態恢復後重複加入導致動畫重複
    const currentFieldCards = this.gameState.getFieldCards()
    if (!currentFieldCards.includes(event.drawn_card)) {
      const newFieldCards = [...currentFieldCards, event.drawn_card]
      this.gameState.updateFieldCards(newFieldCards)
    }

    // 等待 DOM 布局完成
    await waitForLayout(1)

    // 播放翻牌動畫（從牌堆飛到場牌）
    await this.animation.playFlipFromDeckAnimation(event.drawn_card)

    // === 階段 3：保存翻出卡片與可配對目標 ===
    this.gameState.setDrawnCard(event.drawn_card)
    this.gameState.setPossibleTargetCardIds([...event.possible_targets])

    // === 階段 4：更新 FlowStage 和 ActivePlayer ===
    this.gameState.setFlowStage('AWAITING_SELECTION')
    this.gameState.setActivePlayer(event.player_id)

    // === 階段 5：清理動畫層 ===
    this.animation.clearHiddenCards()

    // === 階段 6：啟動操作倒數（從事件接收時間計算，確保與後端同步）===
    const dt = Math.ceil((Date.now() - receivedAt) / 1000)
    this.notification.startCountdown(event.timeout_seconds - dt, 'ACTION')
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
