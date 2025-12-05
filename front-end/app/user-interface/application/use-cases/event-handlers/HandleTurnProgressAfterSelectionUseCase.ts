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

import type { TurnProgressAfterSelectionEvent } from '../../types'
import type { GameStatePort, AnimationPort, NotificationPort } from '../../ports/output'
import type { DomainFacade } from '../../types/domain-facade'
import type { HandleTurnProgressAfterSelectionPort } from '../../ports/input'

export class HandleTurnProgressAfterSelectionUseCase
  implements HandleTurnProgressAfterSelectionPort
{
  constructor(
    private readonly gameState: GameStatePort,
    private readonly animation: AnimationPort,
    private readonly domainFacade: DomainFacade,
    private readonly notification: NotificationPort
  ) {}

  /**
   * 執行選擇後回合進展事件處理
   */
  execute(event: TurnProgressAfterSelectionEvent): Promise<void> {
    return this.executeAsync(event)
  }

  /**
   * 非同步執行動畫和狀態更新
   *
   * 關鍵設計：
   * 1. 提前更新 FlowStage → 觸發 watcher 清除橙色框（問題 1 解決）
   * 2. 轉移動畫完成後才移除場牌 → FLIP 動畫可見（問題 2 解決）
   *
   * 視覺流程（用戶視角）：
   * - 配對特效（pulse）
   * - 配對的牌從場上淡出，飛向獲得區淡入
   * - 剩餘場牌滑順地移動填補空位（FLIP 動畫）
   *
   * 階段：
   * 1. 更新 FlowStage 和清除 AWAITING_SELECTION 狀態（觸發 watcher 隱藏橙色框）
   * 2. 播放翻牌移動和配對動畫（如有配對）
   * 3. 播放轉移動畫（場上淡出 → 獲得區淡入），然後移除場牌觸發 FLIP
   * 4. 更新場牌（無配對時加入翻牌）
   * 5. 更新其他狀態（牌堆數量、役種記錄）
   * 6. 清理動畫層
   */
  private async executeAsync(event: TurnProgressAfterSelectionEvent): Promise<void> {
    const localPlayerId = this.gameState.getLocalPlayerId()
    const isOpponent = event.player_id !== localPlayerId
    const opponentPlayerId = isOpponent ? event.player_id : 'opponent'

    const drawCardPlay = event.draw_card_play
    const capturedCards = drawCardPlay.captured_cards

    // === 階段 1：清除 UI 狀態（解決配對提示殘留問題）===
    // 提前更新 FlowStage 和清除 AWAITING_SELECTION 狀態
    // 這會觸發 PlayerHandZone watcher 退出場牌選擇模式，隱藏橙色框
    this.gameState.setFlowStage(event.next_state.state_type)
    this.gameState.setActivePlayer(event.next_state.active_player_id)
    this.gameState.setDrawnCard(null)
    this.gameState.setPossibleTargetCardIds([])

    // === 階段 2：播放翻牌移動和配對動畫 ===
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

    // === 階段 3：處理有配對的情況 ===
    if (drawCardPlay.matched_card && capturedCards.length > 0) {
      // 3.1 預先隱藏即將加入獲得區的卡片（避免閃現）
      this.animation.hideCards([...capturedCards])

      // 3.2 更新獲得區（新卡片渲染，但被隱藏）
      const currentMyDepository = this.gameState.getDepositoryCards(localPlayerId)
      const currentOpponentDepository = this.gameState.getDepositoryCards(opponentPlayerId)

      if (!isOpponent) {
        const newMyDepository = [...currentMyDepository, ...capturedCards]
        this.gameState.updateDepositoryCards(newMyDepository, currentOpponentDepository)
      } else {
        const newOpponentDepository = [...currentOpponentDepository, ...capturedCards]
        this.gameState.updateDepositoryCards(currentMyDepository, newOpponentDepository)
      }

      // 3.3 等待 DOM 布局完成（讓獲得區新卡片完成渲染）
      await new Promise(resolve => setTimeout(resolve, 0))

      // 3.4 播放轉移動畫（從配對點淡出 → 獲得區淡入）
      // playToDepositoryAnimation 會創建克隆卡片在 matchPosition 淡出，同時在獲得區淡入
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

      // 3.5 移除場牌（觸發 Vue TransitionGroup FLIP 動畫）
      // 此時配對的卡片已在動畫中飛向獲得區，可以安全移除
      const currentFieldCards = this.gameState.getFieldCards()
      const newFieldCards = currentFieldCards.filter(
        id => id !== drawCardPlay.matched_card && id !== drawCardPlay.played_card
      )
      this.gameState.updateFieldCards(newFieldCards)

      // 3.6 等待 TransitionGroup FLIP 動畫完成（300ms + 50ms buffer = 350ms）
      // 讓剩餘場牌滑順地重新排列填補空位
      await new Promise(resolve => setTimeout(resolve, 350))

      console.log('[HandleTurnProgressAfterSelection] 動畫完成，已移除場牌並更新獲得區')
    } else {
      // === 階段 4：處理無配對的情況（將翻牌加入場牌區）===
      const currentFieldCards = this.gameState.getFieldCards()
      const newFieldCards = [...currentFieldCards, drawCardPlay.played_card]
      this.gameState.updateFieldCards(newFieldCards)
      console.log('[HandleTurnProgressAfterSelection] 處理無配對，將翻牌加入場牌區')
    }

    // === 階段 5：更新其他狀態 ===
    this.gameState.updateDeckRemaining(event.deck_remaining)

    // 若有新役種形成，記錄（役種特效動畫為 Post-MVP）
    if (event.yaku_update && event.yaku_update.newly_formed_yaku.length > 0) {
      console.info('[HandleTurnProgressAfterSelection] Yaku formed:',
        event.yaku_update.newly_formed_yaku.map(y => y.yaku_type))
      // TODO: Post-MVP 實作役種特效動畫
    }

    // FlowStage 和 AWAITING_SELECTION 狀態已在階段 1 更新

    // === 階段 6：清理動畫層 ===
    this.animation.clearHiddenCards()

    // === 階段 7：啟動操作倒數 ===
    this.notification.startActionCountdown(event.action_timeout_seconds)
  }
}
