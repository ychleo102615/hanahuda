/**
 * OpponentService - Adapter Layer Controller
 *
 * @description
 * AI 對手服務，定位為 Adapter Layer 的 Controller。
 * 類似 REST Controller 接收 HTTP 請求並呼叫 Use Case，
 * OpponentService 接收事件並呼叫 Use Case。
 *
 * 職責：
 * 1. 監聽 ROOM_CREATED（透過 InternalEventBus）→ 自動建立 AI 並加入遊戲
 * 2. 訂閱 opponentEventBus → 監聽遊戲事件，判斷是否該 AI 行動
 * 3. 依賴 Input Ports（非 Use Case 實作類別）
 *
 * @module server/adapters/opponent/opponentService
 */

import { randomUUID } from 'uncrypto'
import type { GameEvent, FlowState } from '#shared/contracts'
import type { Game } from '~~/server/domain/game/game'
import type { RoomCreatedPayload } from '~~/server/application/ports/output/internalEventPublisherPort'
import type { JoinGameInputPort } from '~~/server/application/ports/input/joinGameInputPort'
import type { PlayHandCardInputPort } from '~~/server/application/ports/input/playHandCardInputPort'
import type { SelectTargetInputPort } from '~~/server/application/ports/input/selectTargetInputPort'
import type { MakeDecisionInputPort } from '~~/server/application/ports/input/makeDecisionInputPort'
import type { GameStorePort } from '~~/server/application/use-cases/joinGameUseCase'
import type { Unsubscribe } from './types'

// Event Buses 從外部注入（interface-based）
interface InternalEventBusLike {
  onRoomCreated(handler: (payload: RoomCreatedPayload) => void): Unsubscribe
}

interface OpponentEventBusLike {
  subscribe(gameId: string, handler: (event: GameEvent) => void): Unsubscribe
}

interface ActionTimeoutManagerLike {
  scheduleAction(key: string, delayMs: number, callback: () => void): void
  clearTimeout(key: string): void
  clearAllForGame(gameId: string): void
}

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
  /** AI 加入遊戲前的延遲最小值 */
  JOIN_MIN_MS: 1000,
  /** AI 加入遊戲前的延遲最大值 */
  JOIN_MAX_MS: 3000,
} as const

/**
 * OpponentService
 *
 * AI 對手服務，Adapter Layer Controller。
 * 接收事件並呼叫對應的 Use Cases。
 */
export class OpponentService {
  /** AI 玩家 ID 集合（用於識別 AI） */
  private readonly aiPlayerIds = new Set<string>()

  /** 遊戲訂閱映射（gameId -> unsubscribe） */
  private readonly gameSubscriptions = new Map<string, Unsubscribe>()

  constructor(
    private readonly internalEventBus: InternalEventBusLike,
    private readonly opponentEventBus: OpponentEventBusLike,
    private readonly joinGame: JoinGameInputPort,
    private readonly playHandCard: PlayHandCardInputPort,
    private readonly selectTarget: SelectTargetInputPort,
    private readonly makeDecision: MakeDecisionInputPort,
    private readonly actionTimeoutManager: ActionTimeoutManagerLike,
    private readonly gameStore: GameStorePort
  ) {
    this.subscribeToRoomCreated()
  }

  /**
   * 訂閱房間建立事件
   */
  private subscribeToRoomCreated(): void {
    this.internalEventBus.onRoomCreated(async (payload) => {
      await this.handleRoomCreated(payload)
    })
    console.log('[OpponentService] Subscribed to ROOM_CREATED')
  }

  /**
   * 處理房間建立事件
   *
   * @param payload - 房間建立事件 Payload
   */
  private async handleRoomCreated(payload: RoomCreatedPayload): Promise<void> {
    console.log(`[OpponentService] ROOM_CREATED received for game ${payload.gameId}`)

    // 1. 建立 AI 玩家
    const aiPlayerId = randomUUID()
    this.aiPlayerIds.add(aiPlayerId)

    // 2. 訂閱該遊戲的 opponentEventBus
    const unsubscribe = this.opponentEventBus.subscribe(payload.gameId, (event) => {
      this.handleGameEvent(payload.gameId, event)
    })
    this.gameSubscriptions.set(payload.gameId, unsubscribe)

    // 3. 透過 Input Port 加入遊戲（延遲模擬對手加入）
    const joinDelay = AI_DELAYS.JOIN_MIN_MS + Math.random() * (AI_DELAYS.JOIN_MAX_MS - AI_DELAYS.JOIN_MIN_MS)

    await this.delay(joinDelay)

    try {
      await this.joinGame.execute({
        playerId: aiPlayerId,
        playerName: 'AI Opponent',
      })
      console.log(`[OpponentService] AI ${aiPlayerId} joined game ${payload.gameId}`)
    } catch (error) {
      console.error(`[OpponentService] Failed to join game ${payload.gameId}:`, error)
      this.aiPlayerIds.delete(aiPlayerId)
      this.cleanupGameSubscription(payload.gameId)
    }
  }

  /**
   * 處理遊戲事件
   *
   * @param gameId - 遊戲 ID
   * @param event - 遊戲事件
   */
  private handleGameEvent(gameId: string, event: GameEvent): void {
    const nextState = event.next_state
    if (!nextState) return

    const nextPlayerId = nextState.active_player_id
    const flowState = nextState.state_type

    // 只處理 AI 玩家的回合
    if (!this.isAiPlayer(nextPlayerId)) return

    console.log(`[OpponentService] AI turn: ${flowState} for player ${nextPlayerId} in game ${gameId}`)

    switch (flowState) {
      case 'AWAITING_HAND_PLAY':
        this.scheduleHandPlay(gameId, nextPlayerId)
        break
      case 'AWAITING_SELECTION':
        this.scheduleSelectTarget(gameId, nextPlayerId, event)
        break
      case 'AWAITING_DECISION':
        this.scheduleDecision(gameId, nextPlayerId)
        break
    }
  }

  /**
   * 排程打手牌操作
   */
  private scheduleHandPlay(gameId: string, playerId: string): void {
    const key = `${gameId}:${playerId}:handPlay`
    const delay = this.getActionDelay()

    this.actionTimeoutManager.scheduleAction(key, delay, async () => {
      try {
        const game = this.gameStore.get(gameId)
        if (!game?.currentRound) {
          console.error(`[OpponentService] No game or round for ${gameId}`)
          return
        }

        // AI 策略：隨機選擇手牌
        const playerState = game.currentRound.playerStates.find((ps) => ps.playerId === playerId)
        if (!playerState || playerState.hand.length === 0) {
          console.error(`[OpponentService] No hand cards for player ${playerId}`)
          return
        }

        // 隨機選擇一張手牌
        const randomIndex = Math.floor(Math.random() * playerState.hand.length)
        const selectedCard = playerState.hand[randomIndex]

        // 嘗試找配對目標（優先配對）
        const targetCardId = this.findMatchingTarget(selectedCard, game.currentRound.field)

        console.log(`[OpponentService] AI plays card ${selectedCard}${targetCardId ? ` -> ${targetCardId}` : ''}`)

        await this.playHandCard.execute({
          gameId,
          playerId,
          cardId: selectedCard,
          targetCardId,
        })
      } catch (error) {
        console.error(`[OpponentService] Failed to play hand card:`, error)
      }
    })
  }

  /**
   * 排程選擇配對目標操作
   */
  private scheduleSelectTarget(gameId: string, playerId: string, event: GameEvent): void {
    const key = `${gameId}:${playerId}:selectTarget`
    const delay = this.getActionDelay()

    this.actionTimeoutManager.scheduleAction(key, delay, async () => {
      try {
        // 從 SelectionRequired 事件中取得選項
        if (event.event_type !== 'SelectionRequired') {
          console.error(`[OpponentService] Unexpected event type: ${event.event_type}`)
          return
        }

        const selectionEvent = event as { drawn_card: string; possible_targets: readonly string[] }
        const drawnCard = selectionEvent.drawn_card
        const possibleTargets = selectionEvent.possible_targets

        if (!possibleTargets || possibleTargets.length === 0) {
          console.error(`[OpponentService] No possible targets for selection`)
          return
        }

        // AI 策略：隨機選擇一個目標
        const randomIndex = Math.floor(Math.random() * possibleTargets.length)
        const selectedTarget = possibleTargets[randomIndex]

        console.log(`[OpponentService] AI selects target ${selectedTarget} for drawn card ${drawnCard}`)

        await this.selectTarget.execute({
          gameId,
          playerId,
          sourceCardId: drawnCard,
          targetCardId: selectedTarget,
        })
      } catch (error) {
        console.error(`[OpponentService] Failed to select target:`, error)
      }
    })
  }

  /**
   * 排程 Koi-Koi 決策操作
   */
  private scheduleDecision(gameId: string, playerId: string): void {
    const key = `${gameId}:${playerId}:decision`
    const delay = this.getActionDelay()

    this.actionTimeoutManager.scheduleAction(key, delay, async () => {
      try {
        // AI 策略（MVP）：直接 END_ROUND
        // TODO: 未來可加入更複雜的策略（根據分數、對手狀態等）
        console.log(`[OpponentService] AI decides: END_ROUND`)

        await this.makeDecision.execute({
          gameId,
          playerId,
          decision: 'END_ROUND',
        })
      } catch (error) {
        console.error(`[OpponentService] Failed to make decision:`, error)
      }
    })
  }

  /**
   * 計算 AI 操作延遲
   *
   * @returns 延遲毫秒數
   */
  private getActionDelay(): number {
    const thinkingDelay =
      AI_DELAYS.THINKING_MIN_MS + Math.random() * (AI_DELAYS.THINKING_MAX_MS - AI_DELAYS.THINKING_MIN_MS)
    return AI_DELAYS.ANIMATION_MS + thinkingDelay
  }

  /**
   * 嘗試找到配對目標
   *
   * @param cardId - 卡片 ID
   * @param field - 場上卡片
   * @returns 配對目標 ID（若有雙重配對則隨機選一張）
   */
  private findMatchingTarget(cardId: string, field: readonly string[]): string | undefined {
    // 卡片 ID 格式：例如 "january_hikari", "february_tan_1"
    // 從卡片 ID 中提取月份
    const month = this.getCardMonth(cardId)
    if (!month) return undefined

    // 找出場上同月份的卡片
    const matches = field.filter((fieldCard) => this.getCardMonth(fieldCard) === month)

    if (matches.length === 0) {
      return undefined // 無配對
    }

    if (matches.length === 1) {
      return matches[0] // 單一配對
    }

    // 雙重配對：隨機選一張
    const randomIndex = Math.floor(Math.random() * matches.length)
    return matches[randomIndex]
  }

  /**
   * 從卡片 ID 中提取月份
   *
   * @param cardId - 卡片 ID（例如 "january_hikari"）
   * @returns 月份字串
   */
  private getCardMonth(cardId: string): string | undefined {
    const parts = cardId.split('_')
    return parts.length > 0 ? parts[0] : undefined
  }

  /**
   * 檢查是否為 AI 玩家
   *
   * @param playerId - 玩家 ID
   * @returns 是否為 AI 玩家
   */
  private isAiPlayer(playerId: string): boolean {
    return this.aiPlayerIds.has(playerId)
  }

  /**
   * 清理遊戲訂閱
   *
   * @param gameId - 遊戲 ID
   */
  private cleanupGameSubscription(gameId: string): void {
    const unsubscribe = this.gameSubscriptions.get(gameId)
    if (unsubscribe) {
      unsubscribe()
      this.gameSubscriptions.delete(gameId)
    }
    this.actionTimeoutManager.clearAllForGame(gameId)
  }

  /**
   * 延遲函數
   *
   * @param ms - 毫秒數
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
