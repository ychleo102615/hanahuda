/**
 * HandleTurnCompletedUseCase
 *
 * @description
 * 處理 TurnCompleted 事件，觸發卡片配對動畫並更新遊戲狀態。
 *
 * 業務流程（7 個主要階段）：
 * 1. 處理手牌操作（動畫）
 * 2. 更新手牌/場牌狀態（移除舊 DOM，避免 cardId 重複）
 * 3. 更新獲得區並播放淡入動畫
 * 4. 處理翻牌操作（同上流程）
 * 5. 更新遊戲流程狀態
 * 6. 啟動操作倒數
 * 7. 清理動畫層
 *
 * @see specs/003-ui-application-layer/contracts/events.md#TurnCompletedEvent
 * @see specs/005-ui-animation-refactor/plan.md#AnimationPort
 */

import type { TurnCompletedEvent, CardPlay } from '#shared/contracts'
import type { GameStatePort, AnimationPort, NotificationPort } from '../../ports/output'
import type { HandleTurnCompletedPort } from '../../ports/input'
import type { DomainFacade } from '../../types/domain-facade'

/**
 * 卡片操作處理結果
 */
interface CardPlayResult {
  /** 被獲得的牌（用於更新獲得區） */
  capturedCards: string[]
  /** 是否有配對 */
  hasMatch: boolean
  /** 打出的牌 */
  playedCard: string
  /** 配對的場牌 */
  matchedCard?: string
  /** 配對位置（用於淡出動畫） */
  matchPosition?: { x: number; y: number }
}

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
  execute(event: TurnCompletedEvent): Promise<void> {
    return this.executeAsync(event)
  }

  /**
   * 非同步執行動畫和狀態更新
   *
   * 關鍵順序：先移除舊 DOM，再渲染新 DOM，避免 cardId 重複導致 findCardElement 找錯元素
   *
   * 階段：
   * 1. 處理手牌操作（動畫 → 移除舊 DOM → 渲染獲得區 → 淡入動畫）
   * 2. 處理翻牌操作（同上流程）
   * 3. 更新場牌（處理無配對的牌）
   * 4. 更新遊戲流程
   * 5. 啟動操作倒數
   * 6. 清理動畫層
   */
  private async executeAsync(event: TurnCompletedEvent): Promise<void> {
    const localPlayerId = this.gameState.getLocalPlayerId()
    const isOpponent = event.player_id !== localPlayerId
    const opponentPlayerId = isOpponent ? event.player_id : 'opponent'

    this.notification.cleanup()
    const startTS = new Date()

    // 追蹤獲得區狀態
    let myDepository = [...this.gameState.getDepositoryCards(localPlayerId)]
    let opponentDepository = [...this.gameState.getDepositoryCards(opponentPlayerId)]

    // === 階段 1：處理手牌操作 ===
    if (event.hand_card_play) {
      const matchedCard = event.hand_card_play.matched_card ?? undefined
      const hasMatch = !!matchedCard

      if (hasMatch && matchedCard) {
        // 1a. 有配對：播放動畫 → 更新獲得區 → 移除場牌/手牌
        const result = await this.processHandCardPlay(event.hand_card_play, isOpponent)

        // 預先隱藏即將加入獲得區的卡片
        this.animation.hideCards(result.capturedCards)

        // 先更新獲得區（新卡片渲染，但被隱藏）
        const updated = this.updateDepository(
          result.capturedCards,
          isOpponent,
          myDepository,
          opponentDepository
        )
        myDepository = updated.my
        opponentDepository = updated.opponent

        // 等待 DOM 布局完成（讓獲得區新卡片完成渲染）
        await new Promise(resolve => setTimeout(resolve, 50))

        // 播放轉移動畫（淡出 + 淡入，視覺上是卡片轉移到獲得區）
        const firstCapturedCard = result.capturedCards[0]
        if (firstCapturedCard) {
          const targetType = this.domainFacade.getCardTypeFromId(firstCapturedCard)
          await this.animation.playToDepositoryAnimation(
            result.capturedCards,
            targetType,
            isOpponent,
            result.matchPosition  // 淡出位置
          )
        }

        // 動畫完成後才移除場牌/手牌
        // TRIPLE_MATCH 時需要移除所有被捕獲的場牌，不只是 matched_card
        const fieldCardsToRemove = result.capturedCards.filter(
          id => id !== event.hand_card_play!.played_card
        )
        fieldCardsToRemove.forEach(cardId => this.removeFieldCard(cardId))
        this.removePlayedHandCard(event.hand_card_play.played_card, isOpponent)

        // 等待 TransitionGroup FLIP 動畫完成
        // FieldZone 和 PlayerHandZone 的 FLIP 動畫時長為 300ms
        // 額外增加 50ms buffer 確保動畫完全結束
        await new Promise(resolve => setTimeout(resolve, 350))
      } else {
        // 1b. 無配對：先加入場牌 → 播放動畫 → 移除手牌
        // 與 HandleSelectionRequiredUseCase 一致的流程：
        // 動畫需要查找場牌區的目標位置，所以必須先加入場牌 DOM

        // 1b.1 預先隱藏手牌（保留 DOM，只是 invisible）
        this.animation.hideCards([event.hand_card_play.played_card])

        // 1b.2 加入場牌 DOM（渲染時已是 invisible 狀態）
        this.addCardsToField([event.hand_card_play.played_card])

        // 1b.3 等待 DOM 布局完成
        await new Promise(resolve => setTimeout(resolve, 50))

        // 1b.4 播放動畫（場牌區已有卡片，可以找到正確目標位置）
        await this.animation.playCardToFieldAnimation(
          event.hand_card_play.played_card,
          isOpponent,
          undefined  // 無配對
        )

        // 1b.5 動畫完成後移除手牌 DOM
        this.removePlayedHandCard(event.hand_card_play.played_card, isOpponent)
      }
    }

    // === 階段 2：處理翻牌操作 ===
    if (event.draw_card_play) {
      // 預先隱藏（在 DOM 存在前記錄到 Set）
      this.animation.hideCards([event.draw_card_play.played_card])

      // 加入場牌（渲染時已是 invisible 狀態，無閃現）
      this.addCardsToField([event.draw_card_play.played_card])

      // 等待 DOM 布局完成
      await new Promise(resolve => setTimeout(resolve, 50))

      // 執行翻牌動畫
      const result = await this.processDrawCardPlay(event.draw_card_play)

      if (result.hasMatch && result.matchedCard) {
        // 2a. 有配對：預先隱藏，更新獲得區，播放轉移動畫，最後移除翻牌和場牌
        // 預先隱藏即將加入獲得區的卡片
        this.animation.hideCards(result.capturedCards)

        // 先更新獲得區（新卡片渲染，但被隱藏）
        const updated = this.updateDepository(
          result.capturedCards,
          isOpponent,
          myDepository,
          opponentDepository
        )
        myDepository = updated.my
        opponentDepository = updated.opponent

        // 等待 DOM 布局完成
        await new Promise(resolve => setTimeout(resolve, 50))

        // 播放轉移動畫（淡出 + 淡入）
        const firstCapturedCard = result.capturedCards[0]
        if (firstCapturedCard) {
          const targetType = this.domainFacade.getCardTypeFromId(firstCapturedCard)
          await this.animation.playToDepositoryAnimation(
            result.capturedCards,
            targetType,
            isOpponent,
            result.matchPosition
          )
        }

        // 動畫完成後才移除翻牌和場牌
        // TRIPLE_MATCH 時需要移除所有被捕獲的場牌，不只是 matched_card
        result.capturedCards.forEach(cardId => this.removeFieldCard(cardId))

        // 等待 DOM 更新完成
        await new Promise(resolve => setTimeout(resolve, 50))
      }
      // 2b. 無配對時不需要額外處理，動畫完成後卡片自然顯示在場牌區
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
   * 處理手牌操作（動畫）
   *
   * 流程：playCardToFieldAnimation → playMatchAnimation（如有配對）
   */
  private async processHandCardPlay(
    cardPlay: CardPlay,
    isOpponent: boolean
  ): Promise<CardPlayResult> {
    const matchedCard = cardPlay.matched_card ?? undefined

    // 播放手牌移動動畫
    await this.animation.playCardToFieldAnimation(
      cardPlay.played_card,
      isOpponent,
      matchedCard
    )

    // 如果有配對，播放合併動畫並取得位置
    let matchPosition: { x: number; y: number } | undefined
    if (matchedCard) {
      const position = await this.animation.playMatchAnimation(
        cardPlay.played_card,
        matchedCard
      )
      matchPosition = position ?? undefined
    }

    return {
      capturedCards: [...cardPlay.captured_cards],
      hasMatch: !!matchedCard,
      playedCard: cardPlay.played_card,
      matchedCard,
      matchPosition,
    }
  }

  /**
   * 處理翻牌操作（動畫）
   *
   * 流程：playFlipFromDeckAnimation → playMatchAnimation（如有配對）
   */
  private async processDrawCardPlay(cardPlay: CardPlay): Promise<CardPlayResult> {
    const matchedCard = cardPlay.matched_card ?? undefined

    // 播放翻牌動畫
    await this.animation.playFlipFromDeckAnimation(cardPlay.played_card)

    // 如果有配對，播放合併動畫並取得位置
    let matchPosition: { x: number; y: number } | undefined
    if (matchedCard) {
      const position = await this.animation.playMatchAnimation(
        cardPlay.played_card,
        matchedCard
      )
      matchPosition = position ?? undefined
    }

    return {
      capturedCards: [...cardPlay.captured_cards],
      hasMatch: !!matchedCard,
      playedCard: cardPlay.played_card,
      matchedCard,
      matchPosition,
    }
  }

  /**
   * 更新獲得區並返回新狀態
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
   * 移除打出的手牌
   *
   * @description
   * 用於動畫完成後立即移除手牌 DOM，避免 cardId 重複
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
   * 移除被配對的場牌
   *
   * @description
   * 用於動畫完成後立即移除場牌 DOM，避免 cardId 重複
   */
  private removeFieldCard(cardId: string): void {
    const currentFieldCards = this.gameState.getFieldCards()
    const newFieldCards = currentFieldCards.filter(id => id !== cardId)
    this.gameState.updateFieldCards(newFieldCards)
  }

  /**
   * 加入無配對的牌到場牌區
   *
   * @description
   * 用於無配對情況下，將打出的牌加入場牌區
   */
  private addCardsToField(cardIds: string[]): void {
    const currentFieldCards = this.gameState.getFieldCards()
    const newFieldCards = [...currentFieldCards, ...cardIds]
    this.gameState.updateFieldCards(newFieldCards)
  }
}
