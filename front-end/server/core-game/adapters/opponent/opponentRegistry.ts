/**
 * OpponentRegistry - Adapter Layer
 *
 * @description
 * AI 對手註冊中心，管理 OpponentInstance 的生命週期。
 * 實現 AiOpponentPort，提供請求驅動的 AI 建立服務。
 *
 * 職責：
 * 1. 接收建立 AI 請求（透過 AiOpponentPort）
 * 2. 建立 OpponentInstance
 * 3. 透過 JoinGameAsAiInputPort 加入遊戲
 * 4. 在 OpponentStore 註冊，供 CompositeEventPublisher 發送事件
 *
 * 設計原則：
 * - 請求驅動（而非事件驅動）：只有 BOT 配對時才建立 AI
 * - OpponentRegistry 是 Controller，不包含業務邏輯
 * - 業務邏輯由 JoinGameAsAiUseCase 和 OpponentInstance 處理
 *
 * @module server/adapters/opponent/opponentRegistry
 */

import { randomUUID } from 'crypto'
import { logger } from '~~/server/utils/logger'
import type { JoinGameAsAiInputPort, AiStrategyType } from '~~/server/core-game/application/ports/input/joinGameAsAiInputPort'
import type { PlayHandCardInputPort } from '~~/server/core-game/application/ports/input/playHandCardInputPort'
import type { SelectTargetInputPort } from '~~/server/core-game/application/ports/input/selectTargetInputPort'
import type { MakeDecisionInputPort } from '~~/server/core-game/application/ports/input/makeDecisionInputPort'
import type { GameStorePort } from '~~/server/core-game/application/ports/output/gameStorePort'
import type { AiOpponentPort, CreateAiOpponentInput } from '~~/server/core-game/application/ports/output/aiOpponentPort'
import { opponentStore } from './opponentStore'
import { OpponentInstance, type OpponentInstanceDependencies, type OpponentInstanceOptions } from './opponentInstance'


/**
 * OpponentRegistry 依賴
 *
 * @description
 * 只依賴 Input Ports 和 GameStore。
 * 計時器由 Opponent BC 內部的 aiActionScheduler 處理。
 */
export interface OpponentRegistryDependencies {
  readonly joinGameAsAi: JoinGameAsAiInputPort
  readonly playHandCard: PlayHandCardInputPort
  readonly selectTarget: SelectTargetInputPort
  readonly makeDecision: MakeDecisionInputPort
  readonly gameStore: GameStorePort
}

/**
 * OpponentRegistry
 *
 * AI 對手註冊中心，實現 AiOpponentPort。
 */
export class OpponentRegistry implements AiOpponentPort {
  /** 已建立的 OpponentInstance 映射 */
  private instances: Map<string, OpponentInstance> = new Map()

  constructor(private readonly deps: OpponentRegistryDependencies) {}

  /**
   * 為指定遊戲建立 AI 對手
   *
   * @description
   * 實現 AiOpponentPort.createAiForGame()。
   * 建立 AI 玩家並嘗試加入遊戲。
   *
   * @param input - 建立 AI 對手的參數
   */
  async createAiForGame(input: CreateAiOpponentInput): Promise<void> {
    const { gameId } = input

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

    // 3. 在 OpponentStore 註冊（讓 CompositeEventPublisher 可以發送事件）
    opponentStore.register({
      gameId,
      playerId: aiPlayerId,
      strategyType,
      createdAt: new Date(),
      handler: (event) => instance.handleEvent(event),
    })

    // 4. 儲存實例引用
    this.instances.set(gameId, instance)

    // 5. 透過 Input Port 加入遊戲（立即執行，不延遲）
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
   * 停止 Registry 並清理所有實例
   *
   * @description
   * 清理所有 AI 實例。
   */
  stop(): void {
    // 清理所有實例
    for (const [gameId, instance] of this.instances) {
      instance.dispose()
      opponentStore.unregister(gameId)
    }
    this.instances.clear()
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
