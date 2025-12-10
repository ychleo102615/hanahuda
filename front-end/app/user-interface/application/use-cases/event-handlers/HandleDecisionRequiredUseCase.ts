/**
 * HandleDecisionRequiredUseCase
 *
 * @description
 * 處理 DecisionRequired 事件（形成役種，需決策），播放動畫並顯示 Koi-Koi 決策 Modal。
 *
 * 業務流程：
 * 1. 播放手牌操作動畫（如有）
 * 2. 播放翻牌操作動畫（如有）
 * 3. 更新場牌、手牌、獲得區狀態
 * 4. 計算當前役種與得分
 * 5. 顯示 Koi-Koi 決策 Modal（僅自己的回合）
 * 6. 更新 FlowStage 為 AWAITING_DECISION
 *
 * @see specs/003-ui-application-layer/contracts/events.md#DecisionRequiredEvent
 * @see specs/003-ui-application-layer/data-model.md#HandleDecisionRequiredUseCase
 */

import type { DecisionRequiredEvent, CardPlay } from '#shared/contracts'
import type { UIStatePort, NotificationPort, GameStatePort, AnimationPort } from '../../ports/output'
import type { DomainFacade } from '../../types/domain-facade'
import type { HandleDecisionRequiredPort } from '../../ports/input'

export class HandleDecisionRequiredUseCase implements HandleDecisionRequiredPort {
  constructor(
    private readonly updateUIState: UIStatePort,
    private readonly notification: NotificationPort,
    private readonly domainFacade: DomainFacade,
    private readonly gameState: GameStatePort,
    private readonly animation: AnimationPort
  ) {}

  execute(event: DecisionRequiredEvent): Promise<void> {
    return this.executeAsync(event)
  }

  private async executeAsync(event: DecisionRequiredEvent): Promise<void> {
    const localPlayerId = this.gameState.getLocalPlayerId()
    const isOpponent = event.player_id !== localPlayerId
    const opponentPlayerId = isOpponent ? event.player_id : 'opponent'

    // 追蹤獲得區狀態
    let myDepository = [...this.gameState.getDepositoryCards(localPlayerId)]
    let opponentDepository = [...this.gameState.getDepositoryCards(opponentPlayerId)]

    // === 階段 1：處理手牌操作動畫 ===
    if (event.hand_card_play) {
      const handCardPlay = event.hand_card_play
      const matchedCard = handCardPlay.matched_card ?? undefined
      const hasMatch = !!matchedCard

      if (hasMatch && matchedCard) {
        // 1a. 有配對：播放動畫 → 更新獲得區 → 移除場牌/手牌
        const matchPosition = await this.processCardPlayAnimation(handCardPlay, isOpponent)

        // 預先隱藏即將加入獲得區的卡片
        this.animation.hideCards([...handCardPlay.captured_cards])

        // 更新獲得區
        const updated = this.updateDepository(
          [...handCardPlay.captured_cards],
          isOpponent,
          myDepository,
          opponentDepository
        )
        myDepository = updated.my
        opponentDepository = updated.opponent

        // 等待 DOM 布局完成
        await new Promise(resolve => setTimeout(resolve, 50))

        // 播放轉移動畫
        const firstCapturedCard = handCardPlay.captured_cards[0]
        if (firstCapturedCard) {
          const targetType = this.domainFacade.getCardTypeFromId(firstCapturedCard)
          await this.animation.playToDepositoryAnimation(
            [...handCardPlay.captured_cards],
            targetType,
            isOpponent,
            matchPosition
          )
        }

        // 移除場牌（TRIPLE_MATCH 時移除所有被捕獲的場牌）
        const fieldCardsToRemove = handCardPlay.captured_cards.filter(
          id => id !== handCardPlay.played_card
        )
        fieldCardsToRemove.forEach(cardId => this.removeFieldCard(cardId))
        this.removePlayedHandCard(handCardPlay.played_card, isOpponent)

        // 等待 TransitionGroup FLIP 動畫完成
        await new Promise(resolve => setTimeout(resolve, 350))
      } else {
        // 1b. 無配對：先加入場牌 → 播放動畫 → 移除手牌
        this.animation.hideCards([handCardPlay.played_card])
        this.addCardsToField([handCardPlay.played_card])
        await new Promise(resolve => setTimeout(resolve, 50))

        await this.animation.playCardToFieldAnimation(
          handCardPlay.played_card,
          isOpponent,
          undefined
        )

        this.removePlayedHandCard(handCardPlay.played_card, isOpponent)
      }
    }

    // === 階段 2：處理翻牌操作動畫 ===
    if (event.draw_card_play) {
      const drawCardPlay = event.draw_card_play
      const matchedCard = drawCardPlay.matched_card ?? undefined

      // 預先隱藏翻牌
      this.animation.hideCards([drawCardPlay.played_card])
      this.addCardsToField([drawCardPlay.played_card])
      await new Promise(resolve => setTimeout(resolve, 50))

      // 播放翻牌動畫
      await this.animation.playFlipFromDeckAnimation(drawCardPlay.played_card)

      if (matchedCard) {
        // 有配對：播放配對動畫
        await this.animation.playCardToFieldAnimation(
          drawCardPlay.played_card,
          isOpponent,
          matchedCard
        )

        const matchPosition = await this.animation.playMatchAnimation(
          drawCardPlay.played_card,
          matchedCard
        )

        // 預先隱藏並更新獲得區
        this.animation.hideCards([...drawCardPlay.captured_cards])

        const updated = this.updateDepository(
          [...drawCardPlay.captured_cards],
          isOpponent,
          myDepository,
          opponentDepository
        )
        myDepository = updated.my
        opponentDepository = updated.opponent

        await new Promise(resolve => setTimeout(resolve, 50))

        // 播放轉移動畫
        const firstCapturedCard = drawCardPlay.captured_cards[0]
        if (firstCapturedCard) {
          const targetType = this.domainFacade.getCardTypeFromId(firstCapturedCard)
          await this.animation.playToDepositoryAnimation(
            [...drawCardPlay.captured_cards],
            targetType,
            isOpponent,
            matchPosition ?? undefined
          )
        }

        // 移除場牌（TRIPLE_MATCH 時移除所有被捕獲的場牌）
        drawCardPlay.captured_cards.forEach(cardId => this.removeFieldCard(cardId))

        await new Promise(resolve => setTimeout(resolve, 50))
      }
      // 無配對時翻牌保留在場上，不需要額外處理
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
      this.notification.startDisplayCountdown(event.action_timeout_seconds)
    }

    // === 階段 6：更新 FlowStage ===
    this.updateUIState.setFlowStage('AWAITING_DECISION')
  }

  /**
   * 播放卡片配對動畫
   */
  private async processCardPlayAnimation(
    cardPlay: CardPlay,
    isOpponent: boolean
  ): Promise<{ x: number; y: number } | undefined> {
    const matchedCard = cardPlay.matched_card ?? undefined

    await this.animation.playCardToFieldAnimation(
      cardPlay.played_card,
      isOpponent,
      matchedCard
    )

    let matchPosition: { x: number; y: number } | undefined
    if (matchedCard) {
      const position = await this.animation.playMatchAnimation(
        cardPlay.played_card,
        matchedCard
      )
      matchPosition = position ?? undefined
    }

    return matchPosition
  }

  /**
   * 更新獲得區
   */
  private updateDepository(
    capturedCards: string[],
    isOpponent: boolean,
    myDepository: string[],
    opponentDepository: string[]
  ): { my: string[]; opponent: string[] } {
    if (isOpponent) {
      opponentDepository = [...opponentDepository, ...capturedCards]
    } else {
      myDepository = [...myDepository, ...capturedCards]
    }

    this.gameState.updateDepositoryCards(myDepository, opponentDepository)
    return { my: myDepository, opponent: opponentDepository }
  }

  /**
   * 移除場牌
   */
  private removeFieldCard(cardId: string): void {
    const currentFieldCards = this.gameState.getFieldCards()
    const newFieldCards = currentFieldCards.filter(id => id !== cardId)
    this.gameState.updateFieldCards(newFieldCards)
  }

  /**
   * 移除手牌
   */
  private removePlayedHandCard(cardId: string, isOpponent: boolean): void {
    if (!isOpponent) {
      const currentHandCards = this.gameState.getHandCards()
      const newHandCards = currentHandCards.filter(id => id !== cardId)
      this.gameState.updateHandCards(newHandCards)
    } else {
      const currentCount = this.gameState.getOpponentHandCount()
      this.gameState.updateOpponentHandCount(currentCount - 1)
    }
  }

  /**
   * 加入場牌
   */
  private addCardsToField(cardIds: string[]): void {
    const currentFieldCards = this.gameState.getFieldCards()
    const newFieldCards = [...currentFieldCards, ...cardIds]
    this.gameState.updateFieldCards(newFieldCards)
  }
}
