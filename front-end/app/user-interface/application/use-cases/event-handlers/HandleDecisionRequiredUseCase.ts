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

import type { DecisionRequiredEvent } from '#shared/contracts'
import type { UIStatePort, NotificationPort, GameStatePort } from '../../ports/output'
import type { DomainFacade } from '../../types/domain-facade'
import type { HandleDecisionRequiredPort } from '../../ports/input'

export class HandleDecisionRequiredUseCase implements HandleDecisionRequiredPort {
  constructor(
    private readonly updateUIState: UIStatePort,
    private readonly notification: NotificationPort,
    private readonly domainFacade: DomainFacade,
    private readonly gameState: GameStatePort
  ) {}

  execute(event: DecisionRequiredEvent): void {
    // 移除舊的卡片移動動畫調用
    // 理由：卡片移動動畫應在前一個事件 (TurnCompleted) 中完成
    // DecisionRequired 事件觸發時，卡片操作已經完成

    // 檢查是否為自己的回合
    const localPlayerId = this.gameState.getLocalPlayerId()
    const isMyTurn = event.player_id === localPlayerId

    // 1. 計算當前役種與得分
    const currentScore = event.yaku_update.all_active_yaku.reduce(
      (sum, yaku) => sum + yaku.base_points,
      0
    )
    const multiplier = event.current_multipliers.player_multipliers[event.player_id] || 1
    const finalScore = currentScore * multiplier

    // 2. 只有自己達成役種才顯示決策 Modal 和啟動倒數
    if (isMyTurn) {
      this.notification.showDecisionModal(
        [...event.yaku_update.all_active_yaku],
        finalScore
      )
      // 4. 啟動 Modal 倒數（DecisionModal 使用 displayCountdown）
      this.notification.startDisplayCountdown(event.action_timeout_seconds)
    }

    // 3. 更新 FlowStage 為 AWAITING_DECISION（不管是誰的回合）
    this.updateUIState.setFlowStage('AWAITING_DECISION')
  }
}
