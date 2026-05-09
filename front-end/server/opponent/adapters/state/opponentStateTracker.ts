/**
 * OpponentStateTracker - Opponent BC Adapter Layer
 *
 * @description
 * 追蹤遊戲狀態，讓 OpponentInstance 不需依賴 GameStorePort。
 * 從 GameEvent 中提取並維護 AI 決策所需的狀態。
 *
 * 設計原則：
 * - 只追蹤 AI 決策所需的最小狀態
 * - 從事件增量更新，不依賴外部狀態儲存
 * - 完全解耦，只依賴共用契約（GameEvent）
 *
 * @module server/opponent/adapter/state/opponentStateTracker
 */

import type {
  GameEvent,
  RoundDealtEvent,
  TurnCompletedEvent,
  SelectionRequiredEvent,
  TurnProgressAfterSelectionEvent,
  DecisionRequiredEvent,
  CardPlay,
  Yaku,
} from '#shared/contracts'

/**
 * OpponentStateTracker
 *
 * @description
 * 追蹤 AI 決策所需的遊戲狀態：
 * - myHand: AI 的手牌（用於選擇打哪張牌）
 * - field: 場上的牌（用於判斷配對）
 * - activeYaku: 當前形成的役種（用於 Koi-Koi 決策）
 */
export class OpponentStateTracker {
  private myHand: string[] = []
  private field: string[] = []
  private activeYaku: Yaku[] = []

  constructor(private readonly myPlayerId: string) {}

  /**
   * 處理遊戲事件，更新內部狀態
   *
   * @param event - 遊戲事件
   */
  handleEvent(event: GameEvent): void {
    switch (event.event_type) {
      case 'RoundDealt':
        this.handleRoundDealt(event as RoundDealtEvent)
        break
      case 'TurnCompleted':
        this.handleTurnCompleted(event as TurnCompletedEvent)
        break
      case 'SelectionRequired':
        this.handleSelectionRequired(event as SelectionRequiredEvent)
        break
      case 'TurnProgressAfterSelection':
        this.handleTurnProgressAfterSelection(event as TurnProgressAfterSelectionEvent)
        break
      case 'DecisionRequired':
        this.handleDecisionRequired(event as DecisionRequiredEvent)
        break
      case 'RoundEnded':
        this.reset()
        break
    }
  }

  /**
   * 處理發牌事件
   *
   * @description
   * 初始化手牌和場牌。
   * 注意：RoundDealtEvent.hands 對 AI 應該包含完整手牌。
   */
  private handleRoundDealt(event: RoundDealtEvent): void {
    // 初始化手牌
    const myHandData = event.hands.find(h => h.player_id === this.myPlayerId)
    this.myHand = myHandData ? [...myHandData.cards] : []
    // 初始化場牌
    this.field = [...event.field]
  }

  /**
   * 處理回合完成事件
   *
   * @description
   * 更新手牌和場牌。
   * - 如果是自己的回合，移除打出的手牌
   * - 根據 CardPlay 更新場牌（移除配對的牌或加入未配對的牌）
   */
  private handleTurnCompleted(event: TurnCompletedEvent): void {
    // 更新手牌（移除打出的牌）
    if (event.player_id === this.myPlayerId) {
      this.myHand = this.myHand.filter(c => c !== event.hand_card_play.played_card)
    }
    // 更新場牌
    this.updateFieldFromCardPlay(event.hand_card_play)
    this.updateFieldFromCardPlay(event.draw_card_play)
  }

  /**
   * 處理選擇需求事件
   *
   * @description
   * 在選擇配對目標之前的狀態更新。
   * 只更新手牌階段的變化，翻牌階段的變化在 TurnProgressAfterSelection 處理。
   */
  private handleSelectionRequired(event: SelectionRequiredEvent): void {
    // 更新手牌（移除打出的牌）
    if (event.player_id === this.myPlayerId) {
      this.myHand = this.myHand.filter(c => c !== event.hand_card_play.played_card)
    }
    // 更新場牌（手牌階段）
    this.updateFieldFromCardPlay(event.hand_card_play)
    // 注意：翻牌階段的場牌變化在 TurnProgressAfterSelection 處理
  }

  /**
   * 處理選擇後回合進度事件
   *
   * @description
   * 更新選擇配對目標後的場牌變化。
   */
  private handleTurnProgressAfterSelection(event: TurnProgressAfterSelectionEvent): void {
    // 更新場牌（翻牌階段）
    // selection 包含 source_card（翻出的牌）和 selected_target（選擇的配對目標）
    // 需要從場上移除被配對的牌
    this.field = this.field.filter(c => c !== event.selection.selected_target)
    // 如果 draw_card_play 有其他配對，也要處理
    this.updateFieldFromCardPlay(event.draw_card_play)
  }

  /**
   * 處理決策需求事件
   *
   * @description
   * 記錄當前形成的役種，用於 Koi-Koi 決策。
   */
  private handleDecisionRequired(event: DecisionRequiredEvent): void {
    // 記錄當前役種
    this.activeYaku = [...event.yaku_update.all_active_yaku]

    // 更新手牌和場牌（如果事件包含 card_play）
    if (event.hand_card_play) {
      if (event.player_id === this.myPlayerId) {
        this.myHand = this.myHand.filter(c => c !== event.hand_card_play!.played_card)
      }
      this.updateFieldFromCardPlay(event.hand_card_play)
    }
    if (event.draw_card_play) {
      this.updateFieldFromCardPlay(event.draw_card_play)
    }
  }

  /**
   * 根據 CardPlay 更新場牌
   *
   * @description
   * - matched_cards 空陣列 = 無配對，牌留在場上
   * - matched_cards 有值 = 有配對，移除被配對的牌（played_card 不留在場上）
   */
  private updateFieldFromCardPlay(play: CardPlay): void {
    if (play.matched_cards.length > 0) {
      // 有配對：移除場上被配對的牌
      const matchedSet = new Set(play.matched_cards)
      this.field = this.field.filter(c => !matchedSet.has(c))
    } else {
      // 無配對：牌留在場上
      this.field.push(play.played_card)
    }
  }

  /**
   * 重置狀態
   *
   * @description
   * 回合結束時重置所有狀態，準備下一局。
   */
  private reset(): void {
    this.myHand = []
    this.field = []
    this.activeYaku = []
  }

  // ============================================================
  // Getters
  // ============================================================

  /**
   * 取得 AI 的手牌
   */
  getMyHand(): readonly string[] {
    return this.myHand
  }

  /**
   * 取得場上的牌
   */
  getField(): readonly string[] {
    return this.field
  }

  /**
   * 取得當前形成的役種
   */
  getActiveYaku(): readonly Yaku[] {
    return this.activeYaku
  }
}
