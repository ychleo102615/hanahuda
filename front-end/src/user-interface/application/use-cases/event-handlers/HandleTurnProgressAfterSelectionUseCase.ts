/**
 * HandleTurnProgressAfterSelectionUseCase
 *
 * @description
 * 處理 TurnProgressAfterSelection 事件，處理選擇後的回合進展。
 *
 * 業務流程：
 * 1. 解析選擇後的翻牌操作
 * 2. 觸發卡片移動動畫
 * 3. 更新場牌、獲得區狀態
 * 4. 若有新役種形成（yaku_update 非 null），觸發役種特效
 * 5. 更新 FlowStage
 *
 * @see specs/003-ui-application-layer/contracts/events.md#TurnProgressAfterSelectionEvent
 * @see specs/003-ui-application-layer/data-model.md#HandleTurnProgressAfterSelectionUseCase
 */

import type { TurnProgressAfterSelectionEvent } from '../../types/events'
import type { UIStatePort, TriggerUIEffectPort } from '../../ports/output'
import type { DomainFacade } from '../../types/domain-facade'
import type { HandleTurnProgressAfterSelectionPort } from '../../ports/input'

export class HandleTurnProgressAfterSelectionUseCase
  implements HandleTurnProgressAfterSelectionPort
{
  constructor(
    private readonly updateUIState: UIStatePort,
    private readonly triggerUIEffect: TriggerUIEffectPort,
    private readonly domainFacade: DomainFacade
  ) {}

  execute(event: TurnProgressAfterSelectionEvent): void {
    // 1. 觸發翻牌卡片移動動畫
    this.triggerUIEffect.triggerAnimation('CARD_MOVE', {
      cardId: event.draw_card_play.played_card,
      from: 'deck',
      to: 'depository',
    })

    // 2. 若有新役種形成，觸發役種特效
    if (event.yaku_update && event.yaku_update.newly_formed_yaku.length > 0) {
      const firstYaku = event.yaku_update.newly_formed_yaku[0]
      if (firstYaku) {
        this.triggerUIEffect.triggerAnimation('YAKU_EFFECT', {
          yakuType: firstYaku.yaku_type,
          affectedCards: [...firstYaku.contributing_cards],
        })
      }
    }

    // 3. 更新 FlowStage
    this.updateUIState.setFlowStage(event.next_state.state_type)
  }
}
