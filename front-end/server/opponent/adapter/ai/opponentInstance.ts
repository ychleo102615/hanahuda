/**
 * OpponentInstance - Opponent BC Adapter Layer
 *
 * @description
 * 單一遊戲的 AI 對手實例。
 * 每個遊戲擁有獨立的 OpponentInstance，負責：
 * 1. 接收遊戲事件
 * 2. 更新內部狀態（透過 OpponentStateTracker）
 * 3. 判斷是否該 AI 行動（Tell, Don't Ask 原則）
 * 4. 執行 AI 策略
 * 5. 呼叫對應的 Input Port
 *
 * 設計原則：
 * - 不依賴 GameStorePort，使用 OpponentStateTracker 追蹤狀態
 * - OpponentInstance 自己判斷是否該行動，而非由 EventPublisher 判斷
 * - 策略實作可擴展（目前僅實作 RANDOM）
 *
 * @module server/opponent/adapter/ai/opponentInstance
 */

import type { GameEvent, Yaku } from '#shared/contracts'
import type { AiStrategyType } from '~~/server/core-game/application/ports/input/joinGameAsAiInputPort'
import type { PlayHandCardInputPort } from '~~/server/core-game/application/ports/input/playHandCardInputPort'
import type { SelectTargetInputPort } from '~~/server/core-game/application/ports/input/selectTargetInputPort'
import type { MakeDecisionInputPort } from '~~/server/core-game/application/ports/input/makeDecisionInputPort'
import { findMatchableTargets } from '~~/server/core-game/domain/services/matchingService'
import type { OpponentStateTracker } from '../state/opponentStateTracker'
import { aiActionScheduler } from '../scheduler/aiActionScheduler'

/**
 * AI 延遲設定（毫秒）
 */
const AI_DELAYS = {
  /** 模擬動畫延遲（固定） */
  ANIMATION_MS: 3000,
  /** 模擬思考延遲最小值 */
  THINKING_MIN_MS: 1500,
  /** 模擬思考延遲最大值 */
  THINKING_MAX_MS: 3000,
} as const

/**
 * OpponentInstance 依賴
 *
 * @description
 * 只依賴 Input Ports 和 OpponentStateTracker。
 * 不再依賴 GameStorePort。
 */
export interface OpponentInstanceDependencies {
  readonly playHandCard: PlayHandCardInputPort
  readonly selectTarget: SelectTargetInputPort
  readonly makeDecision: MakeDecisionInputPort
  readonly stateTracker: OpponentStateTracker
}

/**
 * OpponentInstance 設定
 */
export interface OpponentInstanceOptions {
  /**
   * 清理回調
   *
   * @description
   * 當 OpponentInstance 銷毀時呼叫（遊戲結束）。
   * 用於讓 AiNeededHandler 清理 instances Map 和 opponentStore。
   */
  readonly onCleanup?: () => void
}

/**
 * OpponentInstance
 *
 * 單一遊戲的 AI 對手實例。
 */
export class OpponentInstance {
  private isDisposed = false
  private readonly onCleanup?: () => void

  constructor(
    private readonly gameId: string,
    private readonly playerId: string,
    private readonly strategyType: AiStrategyType,
    private readonly deps: OpponentInstanceDependencies,
    options?: OpponentInstanceOptions
  ) {
    this.onCleanup = options?.onCleanup
  }

  /**
   * 處理遊戲事件
   *
   * @description
   * 這是 OpponentInstance 的核心方法。
   * 1. 先更新 StateTracker 的狀態
   * 2. 遵循 Tell, Don't Ask 原則：自己判斷是否該行動
   *
   * 注意：有些事件（如 SelectionRequired、DecisionRequired）沒有 next_state，
   * 需要直接從事件的 player_id 判斷是否輪到 AI。
   *
   * @param event - 遊戲事件
   */
  handleEvent(event: GameEvent): void {
    if (this.isDisposed) {
      return
    }

    // 1. 更新 StateTracker 的狀態
    this.deps.stateTracker.handleEvent(event)

    // 2. 特殊事件處理：SelectionRequired 和 DecisionRequired 沒有 next_state
    // 需要直接從 player_id 判斷是否輪到 AI
    if (event.event_type === 'SelectionRequired') {
      if (event.player_id === this.playerId) {
        this.scheduleSelectTarget(event)
      }
      return
    }

    if (event.event_type === 'DecisionRequired') {
      if (event.player_id === this.playerId) {
        this.scheduleDecision()
      }
      return
    }

    // 3. 終止事件處理：當遊戲結束時，銷毀實例
    if (event.event_type === 'GameFinished') {
      this.dispose()
      return
    }

    // 4. 回合結束時，取消已排程的 AI 操作（但不銷毀實例）
    if (event.event_type === 'RoundEnded') {
      aiActionScheduler.cancel(this.gameId)
      return
    }

    // 5. 標準事件處理：需要有 next_state 的事件
    if (!('next_state' in event) || !event.next_state) return

    const nextState = event.next_state

    // 只處理輪到自己的事件（Tell, Don't Ask）
    const nextPlayerId = nextState.active_player_id
    if (nextPlayerId !== this.playerId) return

    const flowState = nextState.state_type

    switch (flowState) {
      case 'AWAITING_HAND_PLAY':
        this.scheduleHandPlay()
        break
      case 'AWAITING_SELECTION':
        // 這是從其他事件（如 TurnCompleted）轉換而來的情況
        // 實際上不應該發生，因為 SelectionRequired 會直接觸發
        break
      case 'AWAITING_DECISION':
        // 這是從其他事件轉換而來的情況
        // 實際上不應該發生，因為 DecisionRequired 會直接觸發
        break
    }
  }

  /**
   * 排程打手牌操作
   */
  private scheduleHandPlay(): void {
    const delay = this.getActionDelay()

    aiActionScheduler.schedule(this.gameId, delay, async () => {
      if (this.isDisposed) return

      try {
        // 從 StateTracker 取得手牌和場牌
        const hand = this.deps.stateTracker.getMyHand()
        const field = this.deps.stateTracker.getField()

        if (hand.length === 0) {
          return
        }

        // 執行策略選擇卡片
        const selectedCard = this.selectCardFromHand(hand)
        const targetCardId = this.findMatchingTarget(selectedCard, field)

        await this.deps.playHandCard.execute({
          gameId: this.gameId,
          playerId: this.playerId,
          cardId: selectedCard,
          targetCardId,
        })
      } catch {
        // Error handled silently
      }
    })
  }

  /**
   * 排程選擇配對目標操作
   */
  private scheduleSelectTarget(event: GameEvent): void {
    const delay = this.getActionDelay()

    aiActionScheduler.schedule(this.gameId, delay, async () => {
      if (this.isDisposed) return

      try {
        // 從 SelectionRequired 事件中取得選項
        if (event.event_type !== 'SelectionRequired') {
          return
        }

        const selectionEvent = event as { drawn_card: string; possible_targets: readonly string[] }
        const drawnCard = selectionEvent.drawn_card
        const possibleTargets = selectionEvent.possible_targets

        if (!possibleTargets || possibleTargets.length === 0) {
          return
        }

        // 執行策略選擇目標
        const selectedTarget = this.selectTarget(possibleTargets)

        await this.deps.selectTarget.execute({
          gameId: this.gameId,
          playerId: this.playerId,
          sourceCardId: drawnCard,
          targetCardId: selectedTarget,
        })
      } catch {
        // Error handled silently
      }
    })
  }

  /**
   * 排程 Koi-Koi 決策操作
   */
  private scheduleDecision(): void {
    const delay = this.getActionDelay()

    aiActionScheduler.schedule(this.gameId, delay, async () => {
      if (this.isDisposed) return

      try {
        // 從 StateTracker 取得當前役種資訊
        const activeYaku = this.deps.stateTracker.getActiveYaku()

        // 執行策略選擇決策
        const decision = this.selectDecision(activeYaku)

        await this.deps.makeDecision.execute({
          gameId: this.gameId,
          playerId: this.playerId,
          decision,
        })
      } catch {
        // Error handled silently
      }
    })
  }

  // ============================================================
  // 策略方法（可擴展）
  // ============================================================

  /**
   * 從手牌中選擇一張卡片
   *
   * @param hand - 手牌
   * @returns 選中的卡片 ID
   */
  private selectCardFromHand(hand: readonly string[]): string {
    // 目前所有策略都使用隨機選擇（MVP）
    // TODO: 未來可根據 strategyType 實作不同策略
    const randomIndex = Math.floor(Math.random() * hand.length)
    return hand[randomIndex]
  }

  /**
   * 從可能的目標中選擇一個
   *
   * @param possibleTargets - 可能的目標
   * @returns 選中的目標 ID
   */
  private selectTarget(possibleTargets: readonly string[]): string {
    // 目前所有策略都使用隨機選擇（MVP）
    const randomIndex = Math.floor(Math.random() * possibleTargets.length)
    return possibleTargets[randomIndex]
  }

  /**
   * 選擇 Koi-Koi 決策
   *
   * @description
   * 基於分數閾值的簡單決策邏輯：
   * - 役種總分 >= 5 分：選擇 END_ROUND（保守收場）
   * - 役種總分 < 5 分：選擇 KOI_KOI（繼續挑戰更高分）
   *
   * 5 分閾值涵蓋的役種：三光(6)、豬鹿蝶(5)、赤短/青短(5) 等
   *
   * @param activeYaku - 當前形成的役種列表
   * @returns 決策
   */
  private selectDecision(activeYaku: readonly Yaku[]): 'KOI_KOI' | 'END_ROUND' {
    const SCORE_THRESHOLD = 5

    // 計算當前役種總分
    const totalScore = activeYaku.reduce((sum, yaku) => sum + yaku.base_points, 0)

    // 分數 >= 閾值，保守結束
    if (totalScore >= SCORE_THRESHOLD) {
      return 'END_ROUND'
    }

    // 分數較低，繼續挑戰
    return 'KOI_KOI'
  }

  /**
   * 嘗試找到配對目標
   *
   * @description
   * 使用 Domain 層的 matchingService 進行配對檢測，
   * 確保與遊戲邏輯使用相同的卡片 ID 解析方式（MMTI 格式）。
   *
   * @param cardId - 卡片 ID（MMTI 格式）
   * @param field - 場上卡片
   * @returns 配對目標 ID（若有雙重配對則隨機選一張）
   */
  private findMatchingTarget(cardId: string, field: readonly string[]): string | undefined {
    const matches = findMatchableTargets(cardId, field)

    if (matches.length === 0) {
      return undefined
    }

    if (matches.length === 1) {
      return matches[0]
    }

    // DOUBLE_MATCH 或 TRIPLE_MATCH：隨機選一張
    const randomIndex = Math.floor(Math.random() * matches.length)
    return matches[randomIndex]
  }

  /**
   * 計算 AI 操作延遲
   *
   * @returns 延遲毫秒數
   */
  private getActionDelay(): number {
    const thinkingDelay =
      AI_DELAYS.THINKING_MIN_MS +
      Math.random() * (AI_DELAYS.THINKING_MAX_MS - AI_DELAYS.THINKING_MIN_MS)
    return AI_DELAYS.ANIMATION_MS + thinkingDelay
  }

  /**
   * 銷毀實例
   *
   * @description
   * 清理資源，停止接收事件，並通知外部進行清理。
   */
  dispose(): void {
    if (this.isDisposed) return

    this.isDisposed = true
    aiActionScheduler.cancel(this.gameId)

    // 通知 AiNeededHandler 清理 instances Map 和 opponentStore
    this.onCleanup?.()
  }

  /**
   * 取得玩家 ID
   */
  getPlayerId(): string {
    return this.playerId
  }

  /**
   * 取得策略類型
   */
  getStrategyType(): AiStrategyType {
    return this.strategyType
  }
}
