/**
 * OpponentRegistry - Adapter Layer
 *
 * @description
 * AI 對手註冊中心，管理 OpponentInstance 的生命週期。
 *
 * 職責：
 * 1. 監聽 ROOM_CREATED 事件（透過 InternalEventBus）
 * 2. 建立 OpponentInstance
 * 3. 透過 JoinGameAsAiInputPort 加入遊戲
 * 4. 在 OpponentStore 註冊，供 CompositeEventPublisher 發送事件
 *
 * 設計原則：
 * - OpponentRegistry 是 Controller，不包含業務邏輯
 * - 業務邏輯由 JoinGameAsAiUseCase 和 OpponentInstance 處理
 *
 * @module server/adapters/opponent/opponentRegistry
 */

import { randomUUID } from 'crypto'
import type { RoomCreatedPayload } from '~~/server/core-game/application/ports/output/internalEventPublisherPort'
import type { JoinGameAsAiInputPort, AiStrategyType } from '~~/server/core-game/application/ports/input/joinGameAsAiInputPort'
import type { PlayHandCardInputPort } from '~~/server/core-game/application/ports/input/playHandCardInputPort'
import type { SelectTargetInputPort } from '~~/server/core-game/application/ports/input/selectTargetInputPort'
import type { MakeDecisionInputPort } from '~~/server/core-game/application/ports/input/makeDecisionInputPort'
import type { GameStorePort } from '~~/server/core-game/application/ports/output/gameStorePort'
import { opponentStore } from './opponentStore'
import { OpponentInstance, type OpponentInstanceDependencies, type OpponentInstanceOptions } from './opponentInstance'
import type { Unsubscribe } from './types'

/**
 * AI 加入遊戲延遲設定（毫秒）
 */
const AI_JOIN_DELAYS = {
  /** 加入遊戲前的延遲最小值 */
  MIN_MS: 1000,
  /** 加入遊戲前的延遲最大值 */
  MAX_MS: 3000,
} as const

/**
 * InternalEventBus 介面
 */
interface InternalEventBusLike {
  onRoomCreated(handler: (payload: RoomCreatedPayload) => void): Unsubscribe
}

/**
 * OpponentRegistry 依賴
 *
 * @description
 * 只依賴 Input Ports 和 GameStore。
 * 計時器由 Opponent BC 內部的 aiActionScheduler 處理。
 */
export interface OpponentRegistryDependencies {
  readonly internalEventBus: InternalEventBusLike
  readonly joinGameAsAi: JoinGameAsAiInputPort
  readonly playHandCard: PlayHandCardInputPort
  readonly selectTarget: SelectTargetInputPort
  readonly makeDecision: MakeDecisionInputPort
  readonly gameStore: GameStorePort
}

/**
 * OpponentRegistry
 *
 * AI 對手註冊中心。
 */
export class OpponentRegistry {
  /** 已建立的 OpponentInstance 映射 */
  private instances: Map<string, OpponentInstance> = new Map()

  /** ROOM_CREATED 訂閱取消函數 */
  private unsubscribeRoomCreated: Unsubscribe | null = null

  constructor(private readonly deps: OpponentRegistryDependencies) {}

  /**
   * 啟動 Registry
   *
   * @description
   * 開始監聽 ROOM_CREATED 事件。
   * 應在 Nuxt Plugin 中呼叫。
   */
  start(): void {
    if (this.unsubscribeRoomCreated) {
      return
    }

    this.unsubscribeRoomCreated = this.deps.internalEventBus.onRoomCreated(async (payload) => {
      await this.handleRoomCreated(payload)
    })
  }

  /**
   * 停止 Registry
   *
   * @description
   * 停止監聽事件並清理所有實例。
   */
  stop(): void {
    if (this.unsubscribeRoomCreated) {
      this.unsubscribeRoomCreated()
      this.unsubscribeRoomCreated = null
    }

    // 清理所有實例
    for (const [gameId, instance] of this.instances) {
      instance.dispose()
      opponentStore.unregister(gameId)
    }
    this.instances.clear()
  }

  /**
   * 處理房間建立事件
   *
   * @param payload - 房間建立事件 Payload
   */
  private async handleRoomCreated(payload: RoomCreatedPayload): Promise<void> {
    console.info('[OpponentRegistry] Received ROOM_CREATED event:', payload.gameId)

    // 1. 建立 AI 玩家 ID
    const aiPlayerId = randomUUID()
    const aiPlayerName = 'Computer'
    const strategyType: AiStrategyType = 'RANDOM' // MVP 使用隨機策略

    // 2. 建立 OpponentInstance
    const instanceDeps: OpponentInstanceDependencies = {
      playHandCard: this.deps.playHandCard,
      selectTarget: this.deps.selectTarget,
      makeDecision: this.deps.makeDecision,
      gameStore: this.deps.gameStore,
    }

    // 清理回調：當遊戲結束時，從 instances Map 和 opponentStore 移除
    const instanceOptions: OpponentInstanceOptions = {
      onCleanup: () => {
        this.instances.delete(payload.gameId)
        opponentStore.unregister(payload.gameId)
        console.info('[OpponentRegistry] AI opponent cleaned up for game:', payload.gameId)
      },
    }

    const instance = new OpponentInstance(
      payload.gameId,
      aiPlayerId,
      strategyType,
      instanceDeps,
      instanceOptions
    )

    // 3. 在 OpponentStore 註冊（讓 CompositeEventPublisher 可以發送事件）
    opponentStore.register({
      gameId: payload.gameId,
      playerId: aiPlayerId,
      strategyType,
      createdAt: new Date(),
      handler: (event) => instance.handleEvent(event),
    })

    // 4. 儲存實例引用
    this.instances.set(payload.gameId, instance)

    // 5. 延遲後透過 Input Port 加入遊戲
    const joinDelay = AI_JOIN_DELAYS.MIN_MS + Math.random() * (AI_JOIN_DELAYS.MAX_MS - AI_JOIN_DELAYS.MIN_MS)

    await this.delay(joinDelay)

    try {
      console.info('[OpponentRegistry] AI attempting to join game:', payload.gameId)
      const result = await this.deps.joinGameAsAi.execute({
        playerId: aiPlayerId,
        playerName: aiPlayerName,
        gameId: payload.gameId,
        strategyType,
      })

      if (!result.success) {
        console.warn('[OpponentRegistry] AI failed to join game:', payload.gameId)
        this.cleanupGame(payload.gameId)
      } else {
        console.info('[OpponentRegistry] AI successfully joined game:', payload.gameId)
      }
    } catch (error) {
      console.error('[OpponentRegistry] Error joining game:', payload.gameId, error)
      this.cleanupGame(payload.gameId)
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
   * 延遲函數
   *
   * @param ms - 毫秒數
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * 取得活躍實例數量
   */
  getInstanceCount(): number {
    return this.instances.size
  }
}
