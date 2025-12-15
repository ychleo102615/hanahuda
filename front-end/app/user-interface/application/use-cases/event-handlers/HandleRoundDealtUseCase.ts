/**
 * HandleRoundDealtUseCase
 *
 * @description
 * 處理 RoundDealt 事件，觸發發牌動畫並更新遊戲狀態。
 *
 * 業務流程：
 * 1. 先更新遊戲狀態（讓卡片元素在 DOM 中渲染）
 * 2. 播放發牌動畫
 * 3. 更新 FlowStage
 *
 * Phase 8 重構：使用 AnimationPort 替代 TriggerUIEffectPort
 *
 * @see specs/003-ui-application-layer/contracts/events.md#RoundDealtEvent
 * @see specs/003-ui-application-layer/data-model.md#HandleRoundDealtUseCase
 * @see specs/005-ui-animation-refactor/plan.md#AnimationPort
 */

import type { RoundDealtEvent } from '#shared/contracts'
import type { GameStatePort, AnimationPort, NotificationPort } from '../../ports/output'
import type { HandleRoundDealtPort } from '../../ports/input'

export class HandleRoundDealtUseCase implements HandleRoundDealtPort {
  constructor(
    private readonly gameState: GameStatePort,
    private readonly animation: AnimationPort,
    private readonly notification: NotificationPort
  ) {}

  /**
   * 執行回合發牌事件處理
   *
   * @description
   * 非同步執行動畫序列，確保動畫完成後再設定最終狀態。
   */
  execute(event: RoundDealtEvent): Promise<void> {
    return this.executeAsync(event)
  }

  /**
   * 非同步執行動畫和狀態更新
   */
  private async executeAsync(event: RoundDealtEvent): Promise<void> {
    const localPlayerId = this.gameState.getLocalPlayerId()

    // === 重置上一局的狀態 ===
    // 清理通知系統（停止倒數計時）並隱藏可能還在顯示的面板
    this.notification.cleanup()
    this.notification.hideModal()

    // 清除動畫層的隱藏卡片狀態（上一局殘留的）
    this.animation.clearHiddenCards()

    // 清空獲得區
    this.gameState.updateDepositoryCards([], [])
    // 清除翻牌選擇相關狀態
    this.gameState.setPossibleTargetCardIds([])
    this.gameState.setDrawnCard(null)
    // 重置役種
    this.gameState.updateYaku([], [])
    // 重置 Koi-Koi 倍率
    this.gameState.resetKoiKoiMultipliers()
    // 重置牌堆數量（從 ruleset 取得總牌數，發牌動畫會逐張遞減）
    const totalDeckCards = this.gameState.getRuleset().total_deck_cards
    this.gameState.updateDeckRemaining(totalDeckCards)

    // 記錄莊家 ID
    this.gameState.setDealerId(event.dealer_id)
    const isPlayerDealer = event.dealer_id === localPlayerId

    // 0. 等待頁面載入完成
    // 這是為了確保 Zone 已經註冊，特別是在 Backend 模式下
    // GameStarted 事件觸發導航後，RoundDealt 可能在頁面載入前就到達
    await this.animation.waitForReady(['deck', 'field', 'player-hand', 'opponent-hand'])

    // 1. 先更新遊戲狀態（讓卡片元素在 DOM 中渲染）
    // 這樣動畫系統才能找到卡片元素
    this.gameState.updateFieldCards([...event.field])

    // 更新手牌狀態
    const playerHand = event.hands.find((h) => h.player_id === localPlayerId)
    const opponentHand = event.hands.find((h) => h.player_id !== localPlayerId)

    if (playerHand) {
      this.gameState.updateHandCards([...playerHand.cards])
    }

    // 更新對手手牌數量
    if (opponentHand) {
      this.gameState.updateOpponentHandCount(opponentHand.cards.length)
    }

    // 2. 標記發牌動畫開始
    this.notification.setDealingInProgress(true)

    // 3. 播放發牌動畫（T059/T061/T062）
    // 每張牌發完後更新牌堆數量，配合視覺效果
    await this.animation.playDealAnimation({
      fieldCards: [...event.field],
      playerHandCards: playerHand ? [...playerHand.cards] : [],
      opponentHandCount: opponentHand ? opponentHand.cards.length : 0,
      isPlayerDealer,
      onCardDealt: () => {
        const current = this.gameState.getDeckRemaining()
        this.gameState.updateDeckRemaining(current - 1)
      },
    })

    // 4. 標記發牌動畫結束
    this.notification.setDealingInProgress(false)

    // 5. 動畫完成後更新遊戲狀態
    // 遵循 Server 權威原則：使用 server 提供的 next_state 設定狀態
    this.gameState.setFlowStage(event.next_state.state_type)
    this.gameState.setActivePlayer(event.next_state.active_player_id)

    // 4. 啟動操作倒數
    this.notification.startActionCountdown(event.action_timeout_seconds)
  }
}
