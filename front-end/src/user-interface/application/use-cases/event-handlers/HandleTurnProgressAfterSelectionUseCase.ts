/**
 * HandleTurnProgressAfterSelectionUseCase
 *
 * @description
 * 處理 TurnProgressAfterSelection 事件，處理玩家選擇配對目標後的回合進展。
 *
 * 前置條件：
 * - HandleSelectionRequiredUseCase 已執行，翻牌動畫已播放
 * - 玩家已從 possible_targets 中選擇配對目標
 *
 * 業務流程：
 * 1. 播放配對動畫（牌已翻開，只需配對效果）
 * 2. 若有新役種形成（yaku_update 非 null），記錄役種達成
 * 3. 更新 FlowStage
 *
 * @see specs/003-ui-application-layer/contracts/events.md#TurnProgressAfterSelectionEvent
 * @see specs/003-ui-application-layer/data-model.md#HandleTurnProgressAfterSelectionUseCase
 * @see specs/005-ui-animation-refactor/plan.md#AnimationPort
 */

import type { TurnProgressAfterSelectionEvent } from '../../types/events'
import type { GameStatePort, AnimationPort } from '../../ports/output'
import type { DomainFacade } from '../../types/domain-facade'
import type { HandleTurnProgressAfterSelectionPort } from '../../ports/input'

export class HandleTurnProgressAfterSelectionUseCase
  implements HandleTurnProgressAfterSelectionPort
{
  constructor(
    private readonly gameState: GameStatePort,
    private readonly animation: AnimationPort,
    private readonly domainFacade: DomainFacade
  ) {}

  /**
   * 執行選擇後回合進展事件處理
   */
  execute(event: TurnProgressAfterSelectionEvent): void {
    // 使用 void 忽略 Promise 以符合同步介面
    void this.executeAsync(event)
  }

  /**
   * 非同步執行動畫和狀態更新
   */
  private async executeAsync(event: TurnProgressAfterSelectionEvent): Promise<void> {
    const localPlayerId = this.gameState.getLocalPlayerId()
    const isOpponent = event.player_id !== localPlayerId

    // 1. 播放配對動畫
    // 注意：翻牌動畫已在 HandleSelectionRequiredUseCase 中播放（Phase 8）
    // 這裡只需處理配對效果
    const drawCardPlay = event.draw_card_play

    if (drawCardPlay.matched_card) {
      // 播放合併特效
      await this.animation.playMatchAnimation(
        drawCardPlay.played_card,
        drawCardPlay.matched_card
      )

      // 決定目標分組（使用第一張牌的類型）
      const cardType = this.domainFacade.getCardTypeFromId(drawCardPlay.played_card)

      // 移動配對的牌到獲得區
      await this.animation.playToDepositoryAnimation(
        [...drawCardPlay.captured_cards],
        cardType,
        isOpponent
      )
    }

    // 2. 若有新役種形成，記錄（役種特效動畫為 Post-MVP）
    if (event.yaku_update && event.yaku_update.newly_formed_yaku.length > 0) {
      console.info('[HandleTurnProgressAfterSelection] Yaku formed:',
        event.yaku_update.newly_formed_yaku.map(y => y.yaku_type))
      // TODO: Post-MVP 實作役種特效動畫
    }

    // 3. 更新 FlowStage
    this.gameState.setFlowStage(event.next_state.state_type)
  }
}
