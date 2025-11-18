/**
 * HandleSelectionRequiredUseCase
 *
 * @description
 * 處理 SelectionRequired 事件（翻牌雙重配對），顯示選擇配對 UI。
 *
 * 業務流程：
 * 1. 解析已完成的手牌操作
 * 2. 觸發手牌移動動畫
 * 3. 更新手牌狀態
 * 4. 顯示選擇配對 UI 並高亮可選目標
 * 5. 更新 FlowStage 為 AWAITING_SELECTION
 *
 * @see specs/003-ui-application-layer/contracts/events.md#SelectionRequiredEvent
 * @see specs/003-ui-application-layer/data-model.md#HandleSelectionRequiredUseCase
 */

import type { SelectionRequiredEvent } from '../../types/events'
import type { UIStatePort, TriggerUIEffectPort } from '../../ports/output'
import type { HandleSelectionRequiredPort } from '../../ports/input'

export class HandleSelectionRequiredUseCase implements HandleSelectionRequiredPort {
  constructor(
    private readonly updateUIState: UIStatePort,
    private readonly triggerUIEffect: TriggerUIEffectPort
  ) {}

  execute(event: SelectionRequiredEvent): void {
    // 1. 觸發手牌移動動畫
    this.triggerUIEffect.triggerAnimation('CARD_MOVE', {
      cardId: event.hand_card_play.played_card,
      from: 'hand',
      to: 'depository',
    })

    // 2. 顯示選擇配對 UI 並高亮可選目標
    this.triggerUIEffect.showSelectionUI([...event.possible_targets])

    // 3. 更新 FlowStage 為 AWAITING_SELECTION
    this.updateUIState.setFlowStage('AWAITING_SELECTION')
  }
}
