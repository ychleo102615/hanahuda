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

    // 取得當前狀態（動畫前）
    const currentFieldCards = this.gameState.getFieldCards()
    const currentMyDepository = this.gameState.getDepositoryCards(localPlayerId)
    const opponentPlayerId = isOpponent ? event.player_id : 'opponent'
    const currentOpponentDepository = this.gameState.getDepositoryCards(opponentPlayerId)

    // 1. 播放配對動畫
    // 注意：翻牌動畫已在 HandleSelectionRequiredUseCase 中播放（Phase 8）
    // 這裡只需處理配對效果
    const drawCardPlay = event.draw_card_play

    // 1.1 播放合併特效，獲取場牌位置
    let fieldPosition: { x: number; y: number } | null = null
    if (drawCardPlay.matched_card) {
      fieldPosition = await this.animation.playMatchAnimation(
        drawCardPlay.played_card,
        drawCardPlay.matched_card
      )
    }

    // 2. 收集被捕獲的卡片
    const capturedCards = drawCardPlay.captured_cards

    // 3. 更新狀態
    // 3.1 更新場牌（移除被配對的場牌）
    let newFieldCards = [...currentFieldCards]
    if (drawCardPlay.matched_card) {
      newFieldCards = newFieldCards.filter(id => id !== drawCardPlay.matched_card)
    }
    // 如果翻牌無配對，加入場牌
    if (!drawCardPlay.matched_card) {
      newFieldCards.push(drawCardPlay.played_card)
    }
    this.gameState.updateFieldCards(newFieldCards)

    // 3.2 更新獲得區
    if (capturedCards.length > 0) {
      if (!isOpponent) {
        const newMyDepository = [...currentMyDepository, ...capturedCards]
        this.gameState.updateDepositoryCards(newMyDepository, currentOpponentDepository)
      } else {
        const newOpponentDepository = [...currentOpponentDepository, ...capturedCards]
        this.gameState.updateDepositoryCards(currentMyDepository, newOpponentDepository)
      }
    }

    // 3.3 更新牌堆剩餘數量
    this.gameState.updateDeckRemaining(event.deck_remaining)

    // 4. 若有新役種形成，記錄（役種特效動畫為 Post-MVP）
    if (event.yaku_update && event.yaku_update.newly_formed_yaku.length > 0) {
      console.info('[HandleTurnProgressAfterSelection] Yaku formed:',
        event.yaku_update.newly_formed_yaku.map(y => y.yaku_type))
      // TODO: Post-MVP 實作役種特效動畫
    }

    // 5. 更新 FlowStage 和活動玩家
    this.gameState.setFlowStage(event.next_state.state_type)
    this.gameState.setActivePlayer(event.next_state.active_player_id)

    // 6. 同時播放淡出（在配對位置）和淡入（在獲得區）動畫
    if (capturedCards.length > 0) {
      await this.animation.playFadeInAtCurrentPosition(
        [...capturedCards],
        isOpponent,
        drawCardPlay.played_card,
        fieldPosition ?? undefined
      )
    }

    // 7. 清除隱藏的卡片
    this.animation.clearHiddenCards()
  }
}
