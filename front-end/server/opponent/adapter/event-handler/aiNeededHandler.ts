/**
 * AiNeededHandler - Opponent BC Adapter Layer
 *
 * @description
 * AI 對手需求事件處理器。
 * 訂閱 AI_OPPONENT_NEEDED 事件，建立並管理 AI 對手實例。
 *
 * 職責：
 * 1. 訂閱 AI_OPPONENT_NEEDED 事件
 * 2. 建立 OpponentInstance（含 OpponentStateTracker）
 * 3. 透過 JoinGameAsAiInputPort 加入遊戲
 * 4. 在 OpponentStore 註冊，供 CompositeEventPublisher 發送事件
 *
 * 設計原則：
 * - 事件驅動：接收來自 Core-Game BC 的 AI_OPPONENT_NEEDED 事件
 * - 狀態自主：使用 OpponentStateTracker 追蹤狀態，不依賴 GameStorePort
 * - 只依賴 Input Ports（符合 CA 原則）
 *
 * @module server/opponent/adapter/event-handler/aiNeededHandler
 */

import { randomUUID } from 'crypto'
import { logger } from '~~/server/utils/logger'
import type { JoinGameAsAiInputPort, AiStrategyType } from '~~/server/core-game/application/ports/input/joinGameAsAiInputPort'
import type { PlayHandCardInputPort } from '~~/server/core-game/application/ports/input/playHandCardInputPort'
import type { SelectTargetInputPort } from '~~/server/core-game/application/ports/input/selectTargetInputPort'
import type { MakeDecisionInputPort } from '~~/server/core-game/application/ports/input/makeDecisionInputPort'
import {
  internalEventBus,
  type AiOpponentNeededPayload,
} from '~~/server/shared/infrastructure/event-bus'
import type { Unsubscribe } from '../../domain/types'
import { opponentStore } from '../store/opponentStore'
import { OpponentInstance, type OpponentInstanceDependencies, type OpponentInstanceOptions } from '../ai/opponentInstance'
import { OpponentStateTracker } from '../state/opponentStateTracker'

/**
 * AiNeededHandler 依賴
 *
 * @description
 * 只依賴 Core-Game BC 的 Input Ports。
 * 注意：不再依賴 GameStorePort！
 */
export interface AiNeededHandlerDependencies {
  readonly joinGameAsAi: JoinGameAsAiInputPort
  readonly playHandCard: PlayHandCardInputPort
  readonly selectTarget: SelectTargetInputPort
  readonly makeDecision: MakeDecisionInputPort
}

/**
 * AiNeededHandler
 *
 * @description
 * 訂閱 AI_OPPONENT_NEEDED 事件，建立 AI 對手實例。
 * 取代原本的 OpponentRegistry（改為事件驅動）。
 */
export class AiNeededHandler {
  /** 事件訂閱取消函數 */
  private unsubscribe: Unsubscribe | null = null

  /** 已建立的 OpponentInstance 映射 */
  private instances: Map<string, OpponentInstance> = new Map()

  constructor(private readonly deps: AiNeededHandlerDependencies) {}

  /**
   * 啟動事件處理器
   *
   * @description
   * 訂閱 AI_OPPONENT_NEEDED 事件。
   */
  start(): void {
    if (this.unsubscribe) {
      return // 已啟動
    }

    this.unsubscribe = internalEventBus.onAiOpponentNeeded((payload) => {
      // 使用 void 忽略 Promise，避免阻塞事件處理
      void this.handleAiNeeded(payload)
    })
  }

  /**
   * 停止事件處理器
   *
   * @description
   * 取消訂閱並清理所有 AI 實例。
   */
  stop(): void {
    // 取消訂閱
    if (this.unsubscribe) {
      this.unsubscribe()
      this.unsubscribe = null
    }

    // 清理所有實例
    for (const [gameId, instance] of this.instances) {
      instance.dispose()
      opponentStore.unregister(gameId)
    }
    this.instances.clear()
  }

  /**
   * 處理 AI_OPPONENT_NEEDED 事件
   *
   * @param payload - 事件 Payload
   */
  private async handleAiNeeded(payload: AiOpponentNeededPayload): Promise<void> {
    const { gameId } = payload

    // 1. 建立 AI 玩家 ID
    const aiPlayerId = randomUUID()
    const aiPlayerName = 'Computer'
    const strategyType: AiStrategyType = 'RANDOM' // MVP 使用隨機策略

    // 2. 建立 OpponentStateTracker（追蹤遊戲狀態）
    const stateTracker = new OpponentStateTracker(aiPlayerId)

    // 3. 建立 OpponentInstance
    const instanceDeps: OpponentInstanceDependencies = {
      playHandCard: this.deps.playHandCard,
      selectTarget: this.deps.selectTarget,
      makeDecision: this.deps.makeDecision,
      stateTracker, // 使用 StateTracker 取代 GameStorePort
    }

    // 清理回調：當遊戲結束時，從 instances Map 和 opponentStore 移除
    const instanceOptions: OpponentInstanceOptions = {
      onCleanup: () => {
        this.instances.delete(gameId)
        opponentStore.unregister(gameId)
      },
    }

    const instance = new OpponentInstance(
      gameId,
      aiPlayerId,
      strategyType,
      instanceDeps,
      instanceOptions
    )

    // 4. 在 OpponentStore 註冊（讓 CompositeEventPublisher 可以發送事件）
    opponentStore.register({
      gameId,
      playerId: aiPlayerId,
      strategyType,
      createdAt: new Date(),
      handler: (event) => instance.handleEvent(event),
    })

    // 5. 儲存實例引用
    this.instances.set(gameId, instance)

    // 6. 透過 Input Port 加入遊戲（立即執行，不延遲）
    try {
      const result = await this.deps.joinGameAsAi.execute({
        playerId: aiPlayerId,
        playerName: aiPlayerName,
        gameId,
        strategyType,
      })

      if (!result.success) {
        logger.warn('AI failed to join game', { gameId })
        this.cleanupGame(gameId)
      }
    } catch (error) {
      logger.error('Error joining game', { gameId, error })
      this.cleanupGame(gameId)
    }
  }

  /**
   * 清理遊戲相關資源
   *
   * @description
   * 呼叫 dispose() 觸發 onCleanup 回調，自動清理 instances Map 和 opponentStore。
   *
   * @param gameId - 遊戲 ID
   */
  private cleanupGame(gameId: string): void {
    const instance = this.instances.get(gameId)
    if (instance) {
      instance.dispose()
      // onCleanup 回調會處理 instances.delete() 和 opponentStore.unregister()
    }
  }

  /**
   * 取得活躍實例數量
   */
  getInstanceCount(): number {
    return this.instances.size
  }
}
