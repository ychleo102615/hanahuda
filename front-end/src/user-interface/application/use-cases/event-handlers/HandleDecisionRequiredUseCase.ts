/**
 * HandleDecisionRequiredUseCase
 *
 * @description
 * 處理 DecisionRequired 事件（形成役種，需決策），顯示 Koi-Koi 決策 Modal。
 *
 * 業務流程：
 * 1. 解析本回合的手牌操作與翻牌操作
 * 2. 觸發卡片移動動畫
 * 3. 更新場牌、手牌、獲得區狀態
 * 4. 計算當前役種與得分
 * 5. 顯示 Koi-Koi 決策 Modal
 * 6. 更新 FlowStage 為 AWAITING_DECISION
 *
 * @see specs/003-ui-application-layer/contracts/events.md#DecisionRequiredEvent
 * @see specs/003-ui-application-layer/data-model.md#HandleDecisionRequiredUseCase
 */

import type { DecisionRequiredEvent } from '../../types/events'
import type { UpdateUIStatePort, TriggerUIEffectPort } from '../../ports/output'
import type { DomainFacade } from '../../types/domain-facade'
import type { HandleDecisionRequiredPort } from '../../ports/input'

export class HandleDecisionRequiredUseCase implements HandleDecisionRequiredPort {
  constructor(
    private readonly updateUIState: UpdateUIStatePort,
    private readonly triggerUIEffect: TriggerUIEffectPort,
    private readonly domainFacade: DomainFacade
  ) {}

  execute(event: DecisionRequiredEvent): void {
    // 1. 觸發卡片移動動畫（手牌操作）
    if (event.hand_card_play) {
      this.triggerUIEffect.triggerAnimation('CARD_MOVE', {
        cardId: event.hand_card_play.played_card,
        from: 'hand',
        to: 'depository',
      })
    }

    // 2. 觸發卡片移動動畫（翻牌操作）
    if (event.draw_card_play) {
      this.triggerUIEffect.triggerAnimation('CARD_MOVE', {
        cardId: event.draw_card_play.played_card,
        from: 'deck',
        to: 'depository',
      })
    }

    // 3. 計算當前役種與得分
    const currentScore = event.yaku_update.all_active_yaku.reduce(
      (sum, yaku) => sum + yaku.base_points,
      0
    )
    const multiplier = event.current_multipliers.player_multipliers[event.player_id] || 1
    const finalScore = currentScore * multiplier

    // 4. 顯示 Koi-Koi 決策 Modal
    this.triggerUIEffect.showDecisionModal(
      event.yaku_update.all_active_yaku,
      finalScore,
      undefined // 潛在分數（可選功能，暫不實作）
    )

    // 5. 更新 FlowStage 為 AWAITING_DECISION
    this.updateUIState.setFlowStage('AWAITING_DECISION')
  }
}
