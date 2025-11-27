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

import type { SelectionRequiredEvent } from '../../types/events'
import type { GameStatePort, AnimationPort } from '../../ports/output'
import type { DomainFacade } from '../../types/domain-facade'
import type { HandleSelectionRequiredPort } from '../../ports/input'

export class HandleSelectionRequiredUseCase implements HandleSelectionRequiredPort {
  constructor(
    private readonly gameState: GameStatePort,
    private readonly animation: AnimationPort,
    private readonly domainFacade: DomainFacade
  ) {}

  execute(event: SelectionRequiredEvent): void {
    void this.executeAsync(event)
  }

  /**
   * 非同步執行動畫和狀態更新
   *
   * 業務流程：
   * 1. 手牌階段已完成配對（hand_card_play 包含 matched_card 和 captured_cards）
   * 2. 播放手牌配對動畫
   * 3. 更新獲得區（加入 captured_cards）
   * 4. 移除配對的場牌（matched_card）
   * 5. 更新手牌（移除 played_card）
   * 6. 保存翻出卡片與可配對目標（等待玩家選擇）
   * 7. 設定 AWAITING_SELECTION 狀態
   */
  private async executeAsync(event: SelectionRequiredEvent): Promise<void> {
    const localPlayerId = this.gameState.getLocalPlayerId()
    const isOpponent = event.player_id !== localPlayerId
    const opponentPlayerId = isOpponent ? event.player_id : 'opponent'

    const handCardPlay = event.hand_card_play
    const capturedCards = handCardPlay.captured_cards

    // === 階段 1：播放手牌操作動畫 ===
    let matchPosition: { x: number; y: number } | undefined
    if (handCardPlay.matched_card) {
      // 情況 1：手牌有配對
      // 先播放手牌移動到場牌
      await this.animation.playCardToFieldAnimation(
        handCardPlay.played_card,
        isOpponent,
        handCardPlay.matched_card
      )

      // 播放配對動畫
      const position = await this.animation.playMatchAnimation(
        handCardPlay.played_card,
        handCardPlay.matched_card
      )
      matchPosition = position ?? undefined
    } else {
      // 情況 2：手牌無配對
      // 只播放手牌移動到場牌（無配對目標）
      await this.animation.playCardToFieldAnimation(
        handCardPlay.played_card,
        isOpponent,
        undefined
      )
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
      await new Promise(resolve => setTimeout(resolve, 0))

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

    // === 階段 3：更新場牌 ===
    const currentFieldCards = this.gameState.getFieldCards()
    if (handCardPlay.matched_card) {
      // 情況 1：手牌有配對 → 移除被配對的場牌
      const newFieldCards = currentFieldCards.filter(id => id !== handCardPlay.matched_card)
      this.gameState.updateFieldCards(newFieldCards)
    } else {
      // 情況 2：手牌無配對 → 將打出的手牌加入場牌區
      const newFieldCards = [...currentFieldCards, handCardPlay.played_card]
      this.gameState.updateFieldCards(newFieldCards)
    }

    // 等待 TransitionGroup FLIP 動畫完成
    // FieldZone 的 FLIP 動畫時長為 300ms
    // 額外增加 50ms buffer 確保動畫完全結束
    await new Promise(resolve => setTimeout(resolve, 350))

    // === 階段 4：更新手牌 ===
    if (!isOpponent) {
      const currentHandCards = this.gameState.getHandCards()
      const newHandCards = currentHandCards.filter(id => id !== handCardPlay.played_card)
      this.gameState.updateHandCards(newHandCards)
    } else {
      const currentCount = this.gameState.getOpponentHandCount()
      this.gameState.updateOpponentHandCount(currentCount - 1)
    }

    // === 階段 5：保存翻出卡片與可配對目標 ===
    this.gameState.setDrawnCard(event.drawn_card)
    this.gameState.setPossibleTargetCardIds([...event.possible_targets])

    // === 階段 6：更新 FlowStage ===
    this.gameState.setFlowStage('AWAITING_SELECTION')

    // === 階段 7：清理動畫層 ===
    this.animation.clearHiddenCards()

    // Adapter Layer 的 watcher 會監聽 FlowStage 變為 'AWAITING_SELECTION'
    // 並根據 possibleTargetCardIds 數量調用 uiState.enterFieldCardSelectionMode()
  }
}
