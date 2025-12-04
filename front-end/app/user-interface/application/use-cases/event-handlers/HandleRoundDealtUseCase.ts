/**
 * HandleRoundDealtUseCase
 *
 * @description
 * 處理 RoundDealt 事件，觸發發牌動畫並更新遊戲狀態。
 *
 * 業務流程：
 * 1. 先更新遊戲狀態（讓卡片元素在 DOM 中渲染）
 * 2. 播放發牌動畫
 * 3. 更新 FlowStage
 *
 * Phase 8 重構：使用 AnimationPort 替代 TriggerUIEffectPort
 *
 * @see specs/003-ui-application-layer/contracts/events.md#RoundDealtEvent
 * @see specs/003-ui-application-layer/data-model.md#HandleRoundDealtUseCase
 * @see specs/005-ui-animation-refactor/plan.md#AnimationPort
 */

import type { RoundDealtEvent } from '../../types/events'
import type { GameStatePort, AnimationPort, NotificationPort } from '../../ports/output'
import type { HandleRoundDealtPort } from '../../ports/input'

export class HandleRoundDealtUseCase implements HandleRoundDealtPort {
  constructor(
    private readonly gameState: GameStatePort,
    private readonly animation: AnimationPort,
    private readonly notification: NotificationPort
  ) {}

  /**
   * 執行回合發牌事件處理
   *
   * @description
   * 非同步執行動畫序列，確保動畫完成後再設定最終狀態。
   */
  execute(event: RoundDealtEvent): Promise<void> {
    return this.executeAsync(event)
  }

  /**
   * 非同步執行動畫和狀態更新
   */
  private async executeAsync(event: RoundDealtEvent): Promise<void> {
    const localPlayerId = this.gameState.getLocalPlayerId()

    // 記錄莊家 ID
    this.gameState.setDealerId(event.dealer_id)
    const isPlayerDealer = event.dealer_id === localPlayerId

    // 1. 先更新遊戲狀態（讓卡片元素在 DOM 中渲染）
    // 這樣動畫系統才能找到卡片元素
    this.gameState.updateFieldCards([...event.field])

    // 更新手牌狀態
    const playerHand = event.hands.find((h) => h.player_id === localPlayerId)
    const opponentHand = event.hands.find((h) => h.player_id !== localPlayerId)

    if (playerHand) {
      this.gameState.updateHandCards([...playerHand.cards])
    }

    // 更新對手手牌數量
    if (opponentHand) {
      this.gameState.updateOpponentHandCount(opponentHand.cards.length)
    }

    // 2. 播放發牌動畫（T059/T061/T062）
    // 每張牌發完後更新牌堆數量，配合視覺效果
    await this.animation.playDealAnimation({
      fieldCards: [...event.field],
      playerHandCards: playerHand ? [...playerHand.cards] : [],
      opponentHandCount: opponentHand ? opponentHand.cards.length : 0,
      isPlayerDealer,
      onCardDealt: () => {
        const current = this.gameState.getDeckRemaining()
        this.gameState.updateDeckRemaining(current - 1)
      },
    })

    // 3. 動畫完成後更新 FlowStage
    this.gameState.setFlowStage(event.next_state.state_type)

    // 4. 啟動操作倒數
    this.notification.startActionCountdown(event.action_timeout_seconds)
  }
}
