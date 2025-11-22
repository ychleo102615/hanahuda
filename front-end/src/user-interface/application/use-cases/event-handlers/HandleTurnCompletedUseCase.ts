/**
 * HandleTurnCompletedUseCase
 *
 * @description
 * 處理 TurnCompleted 事件，觸發卡片配對動畫並更新遊戲狀態。
 *
 * 業務流程：
 * 1. 解析手牌操作與翻牌操作
 * 2. 對於有配對的操作：播放配對合併動畫 → 移至獲得區動畫
 * 3. 對於無配對的操作：播放移至場牌動畫
 * 4. 動畫完成後更新牌堆剩餘數量和 FlowStage
 *
 * @see specs/003-ui-application-layer/contracts/events.md#TurnCompletedEvent
 * @see specs/003-ui-application-layer/data-model.md#HandleTurnCompletedUseCase
 * @see specs/005-ui-animation-refactor/plan.md#AnimationPort
 */

import type { TurnCompletedEvent } from '../../types/events'
import type { CardPlay } from '../../types/shared'
import type { GameStatePort, AnimationPort } from '../../ports/output'
import type { HandleTurnCompletedPort } from '../../ports/input'
import type { DomainFacade } from '../../types/domain-facade'

export class HandleTurnCompletedUseCase implements HandleTurnCompletedPort {
  constructor(
    private readonly gameState: GameStatePort,
    private readonly animation: AnimationPort,
    private readonly domainFacade: DomainFacade
  ) {}

  /**
   * 執行回合完成事件處理
   *
   * @description
   * 非同步執行動畫序列，確保動畫完成後再更新狀態。
   * 使用 void 忽略 Promise 以符合 Port 介面簽名。
   */
  execute(event: TurnCompletedEvent): void {
    // 使用 void 忽略 Promise 以符合同步介面
    void this.executeAsync(event)
  }

  /**
   * 非同步執行動畫和狀態更新
   */
  private async executeAsync(event: TurnCompletedEvent): Promise<void> {
    const localPlayerId = this.gameState.getLocalPlayerId()
    const isOpponent = event.player_id !== localPlayerId

    // 1. 處理手牌操作動畫（手牌 → 場牌/獲得區）
    if (event.hand_card_play) {
      await this.playHandCardAnimation(event.hand_card_play, isOpponent)
    }

    // 2. 處理翻牌操作動畫
    // 注意：playFlipFromDeckAnimation 將在 Phase 8 實作
    // Phase 7 只處理翻牌後的配對動畫（如果有配對）
    if (event.draw_card_play) {
      await this.playDrawCardAnimation(event.draw_card_play, isOpponent)
    }

    // 3. 更新牌堆剩餘數量
    this.gameState.updateDeckRemaining(event.deck_remaining)

    // 4. 更新 FlowStage
    this.gameState.setFlowStage(event.next_state.state_type)
  }

  /**
   * 播放手牌操作動畫
   *
   * @description
   * 根據是否有配對執行不同的動畫序列：
   * - 有配對：playMatchAnimation → playToDepositoryAnimation
   * - 無配對：playCardToFieldAnimation
   */
  private async playHandCardAnimation(cardPlay: CardPlay, isOpponent: boolean): Promise<void> {
    if (cardPlay.matched_card) {
      // 有配對：播放合併特效，然後移至獲得區
      await this.animation.playMatchAnimation(
        cardPlay.played_card,
        cardPlay.matched_card
      )

      // 決定目標分組（使用第一張牌的類型）
      const cardType = this.domainFacade.getCardTypeFromId(cardPlay.played_card)

      // 移動配對的牌到獲得區
      await this.animation.playToDepositoryAnimation(
        [...cardPlay.captured_cards],
        cardType,
        isOpponent
      )
    } else {
      // 無配對：移至場牌
      await this.animation.playCardToFieldAnimation(cardPlay.played_card, isOpponent)
    }
  }

  /**
   * 播放翻牌操作動畫
   *
   * @description
   * 翻牌階段的動畫流程：
   * 1. playFlipFromDeckAnimation（Phase 8 實作）
   * 2. 如果有配對：playMatchAnimation → playToDepositoryAnimation
   * 3. 如果無配對：牌已經在場上，不需要額外動畫
   *
   * Phase 7 只處理步驟 2（配對動畫），步驟 1 待 Phase 8 整合。
   */
  private async playDrawCardAnimation(cardPlay: CardPlay, isOpponent: boolean): Promise<void> {
    // TODO: Phase 8 將在這裡加入 playFlipFromDeckAnimation
    // await this.animation.playFlipFromDeckAnimation(cardPlay.played_card)

    if (cardPlay.matched_card) {
      // 有配對：播放合併特效，然後移至獲得區
      await this.animation.playMatchAnimation(
        cardPlay.played_card,
        cardPlay.matched_card
      )

      // 決定目標分組（使用第一張牌的類型）
      const cardType = this.domainFacade.getCardTypeFromId(cardPlay.played_card)

      // 移動配對的牌到獲得區
      await this.animation.playToDepositoryAnimation(
        [...cardPlay.captured_cards],
        cardType,
        isOpponent
      )
    }
    // 無配對時：翻出的牌已經顯示在場上，不需要額外動畫
  }
}
