/**
 * HandleTurnCompletedUseCase
 *
 * @description
 * 處理 TurnCompleted 事件，觸發卡片移動動畫並更新遊戲狀態。
 *
 * 業務流程：
 * 1. 解析手牌操作與翻牌操作
 * 2. 觸發 CARD_MOVE 動畫（手牌、翻牌）
 * 3. 更新牌堆剩餘數量
 * 4. 更新 FlowStage
 *
 * @see specs/003-ui-application-layer/contracts/events.md#TurnCompletedEvent
 * @see specs/003-ui-application-layer/data-model.md#HandleTurnCompletedUseCase
 */

import type { TurnCompletedEvent } from '../../types/events'
import type { UpdateUIStatePort, TriggerUIEffectPort } from '../../ports/output'
import type { HandleTurnCompletedPort } from '../../ports/input'

export class HandleTurnCompletedUseCase implements HandleTurnCompletedPort {
  constructor(
    private readonly updateUIState: UpdateUIStatePort,
    private readonly triggerUIEffect: TriggerUIEffectPort
  ) {}

  execute(event: TurnCompletedEvent): void {
    // 1. 觸發手牌操作的卡片移動動畫
    if (event.hand_card_play) {
      this.triggerUIEffect.triggerAnimation('CARD_MOVE', {
        cardId: event.hand_card_play.played_card,
        from: 'hand',
        to: 'depository',
      })
    }

    // 2. 觸發翻牌操作的卡片移動動畫
    if (event.draw_card_play) {
      this.triggerUIEffect.triggerAnimation('CARD_MOVE', {
        cardId: event.draw_card_play.played_card,
        from: 'deck',
        to: 'depository',
      })
    }

    // 3. 更新牌堆剩餘數量
    this.updateUIState.updateDeckRemaining(event.deck_remaining)

    // 4. 更新 FlowStage
    this.updateUIState.setFlowStage(event.next_state.state_type)
  }
}
