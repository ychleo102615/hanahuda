/**
 * OpponentInstance - Adapter Layer
 *
 * @description
 * 單一遊戲的 AI 對手實例。
 * 每個遊戲擁有獨立的 OpponentInstance，負責：
 * 1. 接收遊戲事件
 * 2. 判斷是否該 AI 行動（Tell, Don't Ask 原則）
 * 3. 執行 AI 策略
 * 4. 呼叫對應的 Input Port
 *
 * 設計原則：
 * - OpponentInstance 自己判斷是否該行動，而非由 EventPublisher 判斷
 * - 策略實作可擴展（目前僅實作 RANDOM）
 *
 * @module server/adapters/opponent/opponentInstance
 */

import type { GameEvent } from '#shared/contracts'
import type { AiStrategyType } from '~~/server/application/ports/input/joinGameAsAiInputPort'
import type { PlayHandCardInputPort } from '~~/server/application/ports/input/playHandCardInputPort'
import type { SelectTargetInputPort } from '~~/server/application/ports/input/selectTargetInputPort'
import type { MakeDecisionInputPort } from '~~/server/application/ports/input/makeDecisionInputPort'
import type { GameStorePort } from '~~/server/application/ports/output/gameStorePort'
import { findMatchableTargets } from '~~/server/domain/services/matchingService'
import { aiActionScheduler } from './aiActionScheduler'

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
 * 只依賴 Input Ports 和 GameStore。
 * 計時器使用 Opponent BC 內部的 aiActionScheduler。
 */
export interface OpponentInstanceDependencies {
  readonly playHandCard: PlayHandCardInputPort
  readonly selectTarget: SelectTargetInputPort
  readonly makeDecision: MakeDecisionInputPort
  readonly gameStore: GameStorePort
}

/**
 * OpponentInstance
 *
 * 單一遊戲的 AI 對手實例。
 */
export class OpponentInstance {
  private isDisposed = false

  constructor(
    private readonly gameId: string,
    private readonly playerId: string,
    private readonly strategyType: AiStrategyType,
    private readonly deps: OpponentInstanceDependencies
  ) {
    console.log(
      `[OpponentInstance] Created for game ${gameId}, player ${playerId}, strategy ${strategyType}`
    )
  }

  /**
   * 處理遊戲事件
   *
   * @description
   * 這是 OpponentInstance 的核心方法。
   * 遵循 Tell, Don't Ask 原則：自己判斷是否該行動。
   *
   * 注意：有些事件（如 SelectionRequired、DecisionRequired）沒有 next_state，
   * 需要直接從事件的 player_id 判斷是否輪到 AI。
   *
   * @param event - 遊戲事件
   */
  handleEvent(event: GameEvent): void {
    if (this.isDisposed) {
      console.log(`[OpponentInstance] Disposed, ignoring event for game ${this.gameId}`)
      return
    }

    // 特殊事件處理：SelectionRequired 和 DecisionRequired 沒有 next_state
    // 需要直接從 player_id 判斷是否輪到 AI
    if (event.event_type === 'SelectionRequired') {
      if (event.player_id === this.playerId) {
        console.log(
          `[OpponentInstance] AI turn: AWAITING_SELECTION for player ${this.playerId} in game ${this.gameId}`
        )
        this.scheduleSelectTarget(event)
      }
      return
    }

    if (event.event_type === 'DecisionRequired') {
      if (event.player_id === this.playerId) {
        console.log(
          `[OpponentInstance] AI turn: AWAITING_DECISION for player ${this.playerId} in game ${this.gameId}`
        )
        this.scheduleDecision()
      }
      return
    }

    // 標準事件處理：需要有 next_state 的事件
    if (!('next_state' in event) || !event.next_state) return

    const nextState = event.next_state

    // 只處理輪到自己的事件（Tell, Don't Ask）
    const nextPlayerId = nextState.active_player_id
    if (nextPlayerId !== this.playerId) return

    const flowState = nextState.state_type
    console.log(
      `[OpponentInstance] AI turn: ${flowState} for player ${this.playerId} in game ${this.gameId}`
    )

    switch (flowState) {
      case 'AWAITING_HAND_PLAY':
        this.scheduleHandPlay()
        break
      case 'AWAITING_SELECTION':
        // 這是從其他事件（如 TurnCompleted）轉換而來的情況
        // 實際上不應該發生，因為 SelectionRequired 會直接觸發
        console.warn(`[OpponentInstance] Unexpected AWAITING_SELECTION from next_state`)
        break
      case 'AWAITING_DECISION':
        // 這是從其他事件轉換而來的情況
        // 實際上不應該發生，因為 DecisionRequired 會直接觸發
        console.warn(`[OpponentInstance] Unexpected AWAITING_DECISION from next_state`)
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
        const game = this.deps.gameStore.get(this.gameId)
        if (!game?.currentRound) {
          console.error(`[OpponentInstance] No game or round for ${this.gameId}`)
          return
        }

        // 取得 AI 的手牌
        const playerState = game.currentRound.playerStates.find(
          (ps) => ps.playerId === this.playerId
        )
        if (!playerState || playerState.hand.length === 0) {
          console.error(`[OpponentInstance] No hand cards for player ${this.playerId}`)
          return
        }

        // 執行策略選擇卡片
        const selectedCard = this.selectCardFromHand(playerState.hand)
        const targetCardId = this.findMatchingTarget(selectedCard, game.currentRound.field)

        console.log(
          `[OpponentInstance] AI plays card ${selectedCard}${targetCardId ? ` -> ${targetCardId}` : ''}`
        )

        await this.deps.playHandCard.execute({
          gameId: this.gameId,
          playerId: this.playerId,
          cardId: selectedCard,
          targetCardId,
        })
      } catch (error) {
        console.error(`[OpponentInstance] Failed to play hand card:`, error)
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
          console.error(`[OpponentInstance] Unexpected event type: ${event.event_type}`)
          return
        }

        const selectionEvent = event as { drawn_card: string; possible_targets: readonly string[] }
        const drawnCard = selectionEvent.drawn_card
        const possibleTargets = selectionEvent.possible_targets

        if (!possibleTargets || possibleTargets.length === 0) {
          console.error(`[OpponentInstance] No possible targets for selection`)
          return
        }

        // 執行策略選擇目標
        const selectedTarget = this.selectTarget(possibleTargets)

        console.log(
          `[OpponentInstance] AI selects target ${selectedTarget} for drawn card ${drawnCard}`
        )

        await this.deps.selectTarget.execute({
          gameId: this.gameId,
          playerId: this.playerId,
          sourceCardId: drawnCard,
          targetCardId: selectedTarget,
        })
      } catch (error) {
        console.error(`[OpponentInstance] Failed to select target:`, error)
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
        // 執行策略選擇決策
        const decision = this.selectDecision()

        console.log(`[OpponentInstance] AI decides: ${decision}`)

        await this.deps.makeDecision.execute({
          gameId: this.gameId,
          playerId: this.playerId,
          decision,
        })
      } catch (error) {
        console.error(`[OpponentInstance] Failed to make decision:`, error)
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
   * @returns 決策
   */
  private selectDecision(): 'KOI_KOI' | 'END_ROUND' {
    // 目前所有策略都選擇 END_ROUND（MVP）
    // TODO: 未來可根據 strategyType 和遊戲狀態實作不同策略
    return 'END_ROUND'
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
   * 清理資源，停止接收事件。
   */
  dispose(): void {
    if (this.isDisposed) return

    this.isDisposed = true
    aiActionScheduler.cancel(this.gameId)
    console.log(`[OpponentInstance] Disposed for game ${this.gameId}`)
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
