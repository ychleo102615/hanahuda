/**
 * HandleDecisionMadeUseCase
 *
 * @description
 * 處理 DecisionMade 事件（僅在選擇 KOI_KOI 時），更新倍率並繼續遊戲。
 *
 * 業務流程：
 * 1. 更新玩家 Koi-Koi 倍率
 * 2. 顯示「繼續遊戲」訊息
 * 3. 更新 FlowStage（返回 AWAITING_HAND_PLAY）
 * 4. 啟動操作倒數
 *
 * @see specs/003-ui-application-layer/contracts/events.md#DecisionMadeEvent
 * @see specs/003-ui-application-layer/data-model.md#HandleDecisionMadeUseCase
 */

import type { DecisionMadeEvent } from '#shared/contracts'
import type { UIStatePort, NotificationPort, GameStatePort } from '../../ports/output'
import type { HandleDecisionMadePort } from '../../ports/input'

export class HandleDecisionMadeUseCase implements HandleDecisionMadePort {
  constructor(
    private readonly updateUIState: UIStatePort,
    private readonly notification: NotificationPort,
    private readonly gameState: GameStatePort
  ) {}

  execute(event: DecisionMadeEvent): void {
    // 1. 更新玩家 Koi-Koi 倍率
    const multiplier = event.updated_multipliers.player_multipliers[event.player_id]
    if (multiplier !== undefined) {
      this.updateUIState.updateKoiKoiMultiplier(event.player_id, multiplier)
    }

    // 2. 顯示「繼續遊戲」訊息（可選，通過 animation 或 message）
    // 暫時省略，視 UI 需求而定

    // 3. 更新 FlowStage 和 ActivePlayer
    this.updateUIState.setFlowStage(event.next_state.state_type)
    this.gameState.setActivePlayer(event.next_state.active_player_id)

    // 4. 啟動操作倒數
    this.notification.startActionCountdown(event.action_timeout_seconds)
  }
}
