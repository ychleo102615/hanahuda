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
   *
   * 關鍵順序：先播放翻牌移動動畫，再播放配對動畫，更新獲得區，播放轉移動畫，最後移除場牌並等待 FLIP 動畫
   *
   * 階段：
   * 1. 播放翻牌移動和配對動畫（如有配對）
   * 2. 更新獲得區並播放轉移動畫（先更新獲得區 → 播放動畫 → 移除場牌 → 等待 FLIP）
   * 3. 更新場牌（無配對時加入翻牌）
   * 4. 更新其他狀態（FlowStage 變化會觸發 watcher 清除場牌選擇模式）
   * 5. 清理動畫層
   */
  private async executeAsync(event: TurnProgressAfterSelectionEvent): Promise<void> {
    const localPlayerId = this.gameState.getLocalPlayerId()
    const isOpponent = event.player_id !== localPlayerId
    const opponentPlayerId = isOpponent ? event.player_id : 'opponent'

    const drawCardPlay = event.draw_card_play
    const capturedCards = drawCardPlay.captured_cards

    // === 階段 1：播放翻牌移動和配對動畫 ===
    // 注意：翻牌動畫已在 HandleSelectionRequiredUseCase 中播放（Phase 8）
    // 這裡需要播放翻牌飛向配對目標的動畫，再播放配對效果
    let matchPosition: { x: number; y: number } | undefined
    if (drawCardPlay.matched_card) {
      // 1.1 播放翻牌飛向配對目標的動畫
      await this.animation.playCardToFieldAnimation(
        drawCardPlay.played_card,
        isOpponent,
        drawCardPlay.matched_card
      )

      // 1.2 播放配對動畫（pulse 效果）
      const position = await this.animation.playMatchAnimation(
        drawCardPlay.played_card,
        drawCardPlay.matched_card
      )
      matchPosition = position ?? undefined
    }

    // === 階段 2：處理有配對的情況 ===
    if (drawCardPlay.matched_card && capturedCards.length > 0) {
      // 2.1 預先隱藏即將加入獲得區的卡片
      this.animation.hideCards([...capturedCards])

      // 2.2 更新獲得區（新卡片渲染，但被隱藏）
      const currentMyDepository = this.gameState.getDepositoryCards(localPlayerId)
      const currentOpponentDepository = this.gameState.getDepositoryCards(opponentPlayerId)

      if (!isOpponent) {
        const newMyDepository = [...currentMyDepository, ...capturedCards]
        this.gameState.updateDepositoryCards(newMyDepository, currentOpponentDepository)
      } else {
        const newOpponentDepository = [...currentOpponentDepository, ...capturedCards]
        this.gameState.updateDepositoryCards(currentMyDepository, newOpponentDepository)
      }

      // 2.3 等待 DOM 布局完成（讓獲得區新卡片完成渲染）
      await new Promise(resolve => setTimeout(resolve, 0))

      // 2.4 播放轉移動畫（淡出 + 淡入，視覺上是卡片轉移到獲得區）
      const firstCapturedCard = capturedCards[0]
      if (firstCapturedCard) {
        const targetType = this.domainFacade.getCardTypeFromId(firstCapturedCard)
        await this.animation.playToDepositoryAnimation(
          [...capturedCards],
          targetType,
          isOpponent,
          matchPosition
        )
      }

      // 2.5 動畫完成後才移除場牌（同時移除翻牌和配對場牌）
      const currentFieldCards = this.gameState.getFieldCards()
      const newFieldCards = currentFieldCards.filter(
        id => id !== drawCardPlay.matched_card && id !== drawCardPlay.played_card
      )
      this.gameState.updateFieldCards(newFieldCards)

      // 2.6 等待 TransitionGroup FLIP 動畫完成（300ms + 50ms buffer = 350ms）
      await new Promise(resolve => setTimeout(resolve, 350))

      console.log('[HandleTurnProgressAfterSelection] 動畫完成，已移除場牌')
    } else {
      // === 階段 3：處理無配對的情況（將翻牌加入場牌區）===
      const currentFieldCards = this.gameState.getFieldCards()
      const newFieldCards = [...currentFieldCards, drawCardPlay.played_card]
      this.gameState.updateFieldCards(newFieldCards)
      console.log('[HandleTurnProgressAfterSelection] 處理無配對，將翻牌加入場牌區')
    }

    // === 階段 4：更新其他狀態 ===
    this.gameState.updateDeckRemaining(event.deck_remaining)

    // 若有新役種形成，記錄（役種特效動畫為 Post-MVP）
    if (event.yaku_update && event.yaku_update.newly_formed_yaku.length > 0) {
      console.info('[HandleTurnProgressAfterSelection] Yaku formed:',
        event.yaku_update.newly_formed_yaku.map(y => y.yaku_type))
      // TODO: Post-MVP 實作役種特效動畫
    }

    // 更新 FlowStage（會觸發 PlayerHandZone watcher 自動清除場牌選擇模式）
    this.gameState.setFlowStage(event.next_state.state_type)
    this.gameState.setActivePlayer(event.next_state.active_player_id)

    // 清除 AWAITING_SELECTION 相關狀態（在 FlowStage 更新後）
    this.gameState.setDrawnCard(null)
    this.gameState.setPossibleTargetCardIds([])

    // === 階段 5：清理動畫層 ===
    this.animation.clearHiddenCards()
  }
}
