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
import type { HandleSelectionRequiredPort } from '../../ports/input'

export class HandleSelectionRequiredUseCase implements HandleSelectionRequiredPort {
  constructor(
    private readonly gameState: GameStatePort,
    private readonly animation: AnimationPort
  ) {}

  execute(event: SelectionRequiredEvent): void {
    void this.executeAsync(event)
  }

  /**
   * 非同步執行動畫和狀態更新
   */
  private async executeAsync(event: SelectionRequiredEvent): Promise<void> {
    const localPlayerId = this.gameState.getLocalPlayerId()
    const isOpponent = event.player_id !== localPlayerId

    // === 階段 1：處理手牌操作動畫 ===
    await this.animation.playCardToFieldAnimation(
      event.hand_card_play.played_card,
      isOpponent,
      undefined  // SelectionRequired 事件不包含 matched_card
    )

    // === 階段 2：更新手牌狀態 ===
    // 移除打出的手牌
    if (!isOpponent) {
      const currentHandCards = this.gameState.getHandCards()
      const newHandCards = currentHandCards.filter(id => id !== event.hand_card_play.played_card)
      this.gameState.updateHandCards(newHandCards)
    } else {
      const currentCount = this.gameState.getOpponentHandCount()
      this.gameState.updateOpponentHandCount(currentCount - 1)
    }

    // === 階段 3：更新場牌狀態 ===
    // 將打出的牌加入場牌
    const currentFieldCards = this.gameState.getFieldCards()
    const newFieldCards = [...currentFieldCards, event.hand_card_play.played_card]
    this.gameState.updateFieldCards(newFieldCards)

    // === 階段 4：保存可配對目標 ===
    this.gameState.setPossibleTargetCardIds([...event.possible_targets])

    // === 階段 5：更新 FlowStage ===
    this.gameState.setFlowStage('AWAITING_SELECTION')

    // Adapter Layer 的 watcher 會監聽 FlowStage 變為 'AWAITING_SELECTION'
    // 並根據 possibleTargetCardIds 數量調用 uiState.enterFieldCardSelectionMode()
  }
}
