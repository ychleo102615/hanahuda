/**
 * HandleSelectionRequiredUseCase
 *
 * @description
 * 處理 SelectionRequired 事件（翻牌雙重配對），觸發動畫並更新遊戲狀態。
 *
 * 業務流程（重構後）：
 * 1. 處理手牌操作（動畫）
 * 2. 更新手牌/場牌狀態
 * 3. 保存可配對目標到狀態
 * 4. 更新 FlowStage 為 AWAITING_SELECTION
 * 5. Adapter Layer 監聽 FlowStage 變化，觸發場牌選擇 UI
 *
 * @see specs/003-ui-application-layer/contracts/events.md#SelectionRequiredEvent
 * @see specs/003-ui-application-layer/data-model.md#HandleSelectionRequiredUseCase
 * @see specs/005-ui-animation-refactor/plan.md#AnimationPort
 */

import type { SelectionRequiredEvent } from '#shared/contracts'
import type { GameStatePort, AnimationPort, NotificationPort, DelayManagerPort } from '../../ports/output'
import { DelayAbortedError } from '../../ports/output'
import type { DomainFacade } from '../../types/domain-facade'
import type { HandleSelectionRequiredPort } from '../../ports/input'

export class HandleSelectionRequiredUseCase implements HandleSelectionRequiredPort {
  constructor(
    private readonly gameState: GameStatePort,
    private readonly animation: AnimationPort,
    private readonly domainFacade: DomainFacade,
    private readonly notification: NotificationPort,
    private readonly delayManager: DelayManagerPort
  ) {}

  execute(event: SelectionRequiredEvent): Promise<void> {
    return this.executeAsync(event)
  }

  /**
   * 非同步執行動畫和狀態更新
   */
  private async executeAsync(event: SelectionRequiredEvent): Promise<void> {
    try {
      await this.executeAsyncCore(event)
    } catch (error) {
      if (error instanceof DelayAbortedError) {
        console.info('[HandleSelectionRequiredUseCase] Aborted due to state recovery')
        return
      }
      throw error
    }
  }

  /**
   * 核心執行邏輯（可被中斷）
   *
   * 業務流程：
   * 1. 播放手牌操作動畫（有配對 or 無配對）
   * 2. 更新獲得區（若手牌有配對，加入 captured_cards）
   * 3. 更新手牌（移除 played_card）
   * 4. 更新場牌（有配對：移除 matched_card；無配對：加入 played_card）
   * 5. 播放翻牌動畫（從牌堆飛到場牌）
   * 6. 保存翻出卡片與可配對目標（等待玩家選擇）
   * 7. 設定 AWAITING_SELECTION 狀態
   * 8. 清理動畫層
   */
  private async executeAsyncCore(event: SelectionRequiredEvent): Promise<void> {
    const localPlayerId = this.gameState.getLocalPlayerId()
    const isOpponent = event.player_id !== localPlayerId
    const opponentPlayerId = isOpponent ? event.player_id : 'opponent'

    const handCardPlay = event.hand_card_play
    const capturedCards = handCardPlay.captured_cards

    // === 階段 1：播放手牌操作動畫 ===
    let matchPosition: { x: number; y: number } | undefined
    if (handCardPlay.matched_card) {
      // 情況 1：手牌有配對
      await this.animation.playCardToFieldAnimation(
        handCardPlay.played_card,
        isOpponent,
        handCardPlay.matched_card
      )

      const position = await this.animation.playMatchAnimation(
        handCardPlay.played_card,
        handCardPlay.matched_card
      )
      matchPosition = position ?? undefined
    } else {
      // 情況 2：手牌無配對
      // 需要先加入場牌 DOM，動畫才能飛到正確的新增位置
      // 但手牌 DOM 要保留到動畫播放完成後才移除

      // 1.1 預先隱藏手牌（保留 DOM，只是 invisible）
      this.animation.hideCards([handCardPlay.played_card])

      // 1.2 加入場牌 DOM（渲染時已是 invisible 狀態）
      const currentFieldCards = this.gameState.getFieldCards()
      const newFieldCards = [...currentFieldCards, handCardPlay.played_card]
      this.gameState.updateFieldCards(newFieldCards)

      // 1.3 等待 DOM 布局完成（增加延遲確保 TransitionGroup 完成渲染）
      await this.delayManager.delay(50)

      // 1.4 播放動畫（手牌 DOM 還在，可以找到正確起始位置）
      await this.animation.playCardToFieldAnimation(
        handCardPlay.played_card,
        isOpponent,
        undefined
      )

      // 1.5 動畫完成後移除手牌 DOM
      if (!isOpponent) {
        const currentHandCards = this.gameState.getHandCards()
        const newHandCards = currentHandCards.filter(id => id !== handCardPlay.played_card)
        this.gameState.updateHandCards(newHandCards)
      } else {
        const currentCount = this.gameState.getOpponentHandCount()
        this.gameState.updateOpponentHandCount(currentCount - 1)
      }
    }

    // === 階段 2：更新獲得區（手牌配對成功時）===
    if (capturedCards.length > 0) {
      // 2.1 預先隱藏即將加入獲得區的卡片
      this.animation.hideCards([...capturedCards])

      // 2.2 更新獲得區
      const currentMyDepository = this.gameState.getDepositoryCards(localPlayerId)
      const currentOpponentDepository = this.gameState.getDepositoryCards(opponentPlayerId)

      if (!isOpponent) {
        const newMyDepository = [...currentMyDepository, ...capturedCards]
        this.gameState.updateDepositoryCards(newMyDepository, currentOpponentDepository)
      } else {
        const newOpponentDepository = [...currentOpponentDepository, ...capturedCards]
        this.gameState.updateDepositoryCards(currentMyDepository, newOpponentDepository)
      }

      // 2.3 等待 DOM 布局完成
      await this.delayManager.delay(50)

      // 2.4 播放轉移動畫（卡片轉移到獲得區）
      const firstCapturedCard = capturedCards[0]
      if (firstCapturedCard) {
        const targetType = this.domainFacade.getCardTypeFromId(firstCapturedCard)
        await this.animation.playToDepositoryAnimation(
          [...capturedCards],
          targetType,
          isOpponent,
          matchPosition
        )
      }
    }

    // === 階段 3：更新手牌和場牌 ===
    if (handCardPlay.matched_card) {
      // 情況 1：手牌有配對
      // 3.1 移除打出的手牌
      if (!isOpponent) {
        const currentHandCards = this.gameState.getHandCards()
        const newHandCards = currentHandCards.filter(id => id !== handCardPlay.played_card)
        this.gameState.updateHandCards(newHandCards)
      } else {
        const currentCount = this.gameState.getOpponentHandCount()
        this.gameState.updateOpponentHandCount(currentCount - 1)
      }

      // 3.2 移除被配對的場牌
      const currentFieldCards = this.gameState.getFieldCards()
      const newFieldCards = currentFieldCards.filter(id => id !== handCardPlay.matched_card)
      this.gameState.updateFieldCards(newFieldCards)

      // 3.3 等待 TransitionGroup FLIP 動畫完成
      await this.delayManager.delay(350)
    }
    // 情況 2：手牌無配對時，已在階段 1 完成手牌移除和場牌加入

    // === 階段 5：處理翻牌動畫 ===
    // 預先隱藏翻出的牌（避免閃現）
    this.animation.hideCards([event.drawn_card])

    // 加入場牌（渲染時已是 invisible 狀態）
    {
      const currentFieldCards = this.gameState.getFieldCards()
      const newFieldCards = [...currentFieldCards, event.drawn_card]
      this.gameState.updateFieldCards(newFieldCards)
    }

    // 等待 DOM 布局完成
    await this.delayManager.waitForLayout()

    // 播放翻牌動畫（從牌堆飛到場牌）
    await this.animation.playFlipFromDeckAnimation(event.drawn_card)

    // === 階段 6：保存翻出卡片與可配對目標 ===
    this.gameState.setDrawnCard(event.drawn_card)
    this.gameState.setPossibleTargetCardIds([...event.possible_targets])

    // === 階段 7：更新 FlowStage 和 ActivePlayer ===
    this.gameState.setFlowStage('AWAITING_SELECTION')
    this.gameState.setActivePlayer(event.player_id)

    // === 階段 8：清理動畫層 ===
    this.animation.clearHiddenCards()

    // === 階段 9：啟動操作倒數 ===
    this.notification.startActionCountdown(event.action_timeout_seconds)

    // Adapter Layer 的 watcher 會監聽 FlowStage 變為 'AWAITING_SELECTION'
    // 並根據 possibleTargetCardIds 數量調用 uiState.enterFieldCardSelectionMode()
  }
}
