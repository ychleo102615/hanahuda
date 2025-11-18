/**
 * HandleRoundDealtUseCase
 *
 * @description
 * 處理 RoundDealt 事件，觸發發牌動畫並更新遊戲狀態。
 *
 * 業務流程：
 * 1. 觸發 DEAL_CARDS 動畫
 * 2. 更新場牌狀態
 * 3. 更新手牌狀態（player-1 為當前玩家）
 * 4. 更新牌堆剩餘數量
 * 5. 更新 FlowStage
 *
 * @see specs/003-ui-application-layer/contracts/events.md#RoundDealtEvent
 * @see specs/003-ui-application-layer/data-model.md#HandleRoundDealtUseCase
 */

import type { RoundDealtEvent } from '../../types/events'
import type { UIStatePort, TriggerUIEffectPort } from '../../ports/output'
import type { HandleRoundDealtPort } from '../../ports/input'

export class HandleRoundDealtUseCase implements HandleRoundDealtPort {
  constructor(
    private readonly updateUIState: UIStatePort,
    private readonly triggerUIEffect: TriggerUIEffectPort
  ) {}

  execute(event: RoundDealtEvent): void {
    // 1. 觸發發牌動畫
    this.triggerUIEffect.triggerAnimation('DEAL_CARDS', {
      fieldCards: [...event.field],
      hands: event.hands.map(h => ({ player_id: h.player_id, cards: [...h.cards] })),
    })

    // 2. 更新場牌狀態
    this.updateUIState.updateFieldCards([...event.field])

    // 3. 更新手牌狀態（假設 player-1 是當前玩家）
    const playerHand = event.hands.find((h) => h.player_id === 'player-1')
    if (playerHand) {
      this.updateUIState.updateHandCards([...playerHand.cards])
    }

    // 4. 更新牌堆剩餘數量
    this.updateUIState.updateDeckRemaining(event.deck_remaining)

    // 5. 更新 FlowStage
    this.updateUIState.setFlowStage(event.next_state.state_type)
  }
}
