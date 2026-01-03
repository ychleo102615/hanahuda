/**
 * Dependency Container - Composition Root
 *
 * @description
 * 依賴注入容器，管理所有單例依賴。
 * 使用 Symbol Token + resolve 模式，與前端設計一致。
 *
 * 設計原則：
 * - 所有依賴都在這裡建立和組裝
 * - API 端點透過 Token 從 Container 取得 Input Port
 * - 確保依賴抽象（Dependency Inversion Principle）
 *
 * @module server/utils/container
 */

import { DIContainer, BACKEND_TOKENS } from '~~/server/lib/di'

// Adapters - Persistence
import { inMemoryGameStore } from '~~/server/core-game/adapters/persistence/inMemoryGameStore'
import { gameRepository } from '~~/server/core-game/adapters/persistence/drizzleGameRepository'
import { playerStatsRepository } from '~~/server/core-game/adapters/persistence/drizzlePlayerStatsRepository'
import { gameLogRepository } from '~~/server/core-game/adapters/persistence/drizzleGameLogRepository'

// Adapters - Event Publisher
import { internalEventBus } from '~~/server/core-game/adapters/event-publisher/internalEventBus'
import { createCompositeEventPublisher } from '~~/server/core-game/adapters/event-publisher/compositeEventPublisher'

// Adapters - Mappers
import { eventMapper } from '~~/server/core-game/adapters/mappers/eventMapper'

// Adapters - Timeout
import { gameTimeoutManager } from '~~/server/core-game/adapters/timeout/gameTimeoutManager'

// Adapters - Lock
import { inMemoryGameLock } from '~~/server/core-game/adapters/lock/inMemoryGameLock'

// Use Cases
import { JoinGameUseCase } from '~~/server/core-game/application/use-cases/joinGameUseCase'
import { JoinGameAsAiUseCase } from '~~/server/core-game/application/use-cases/joinGameAsAiUseCase'
import { PlayHandCardUseCase } from '~~/server/core-game/application/use-cases/playHandCardUseCase'
import { SelectTargetUseCase } from '~~/server/core-game/application/use-cases/selectTargetUseCase'
import { MakeDecisionUseCase } from '~~/server/core-game/application/use-cases/makeDecisionUseCase'
import { LeaveGameUseCase } from '~~/server/core-game/application/use-cases/leaveGameUseCase'
import { AutoActionUseCase } from '~~/server/core-game/application/use-cases/autoActionUseCase'
import { RecordGameStatsUseCase } from '~~/server/core-game/application/use-cases/recordGameStatsUseCase'
import { ConfirmContinueUseCase } from '~~/server/core-game/application/use-cases/confirmContinueUseCase'

// Application Services
import { TurnFlowService } from '~~/server/core-game/application/services/turnFlowService'
import { GameStartService } from '~~/server/core-game/application/services/gameStartService'

// Input Port Types (only importing types used for explicit type annotations)
import type { LeaveGameInputPort } from '~~/server/core-game/application/ports/input/leaveGameInputPort'
import type { AutoActionInputPort } from '~~/server/core-game/application/ports/input/autoActionInputPort'
import type { RecordGameStatsInputPort } from '~~/server/core-game/application/ports/input/recordGameStatsInputPort'
import type { ConfirmContinueInputPort } from '~~/server/core-game/application/ports/input/confirmContinueInputPort'

/**
 * 建立並設定 DI Container
 */
function createBackendContainer(): DIContainer {
  const diContainer = new DIContainer()

  // ===== 1. 註冊 Adapters =====
  diContainer.register(BACKEND_TOKENS.GameStore, () => inMemoryGameStore, { singleton: true })
  diContainer.register(BACKEND_TOKENS.GameRepository, () => gameRepository, { singleton: true })
  diContainer.register(BACKEND_TOKENS.PlayerStatsRepository, () => playerStatsRepository, { singleton: true })
  diContainer.register(BACKEND_TOKENS.GameLogRepository, () => gameLogRepository, { singleton: true })
  diContainer.register(BACKEND_TOKENS.EventMapper, () => eventMapper, { singleton: true })
  diContainer.register(BACKEND_TOKENS.InternalEventBus, () => internalEventBus, { singleton: true })
  diContainer.register(BACKEND_TOKENS.GameTimeoutManager, () => gameTimeoutManager, { singleton: true })
  diContainer.register(BACKEND_TOKENS.GameLock, () => inMemoryGameLock, { singleton: true })

  // ===== 2. 註冊 CompositeEventPublisher =====
  const compositeEventPublisher = createCompositeEventPublisher(gameLogRepository)
  diContainer.register(BACKEND_TOKENS.EventPublisher, () => compositeEventPublisher, { singleton: true })

  // ===== 3. 註冊 Use Cases (Input Ports) =====

  // RecordGameStatsUseCase（無循環依賴）
  const recordGameStatsUseCase: RecordGameStatsInputPort = new RecordGameStatsUseCase(playerStatsRepository)
  diContainer.register(BACKEND_TOKENS.RecordGameStatsInputPort, () => recordGameStatsUseCase, { singleton: true })

  // LeaveGameUseCase
  const leaveGameUseCase: LeaveGameInputPort = new LeaveGameUseCase(
    gameRepository,
    compositeEventPublisher,
    inMemoryGameStore,
    eventMapper,
    inMemoryGameLock,
    gameTimeoutManager,
    recordGameStatsUseCase,
    gameLogRepository
  )
  diContainer.register(BACKEND_TOKENS.LeaveGameInputPort, () => leaveGameUseCase, { singleton: true })

  /**
   * 解決循環依賴：
   * - autoActionUseCase 需要 playHandCardUseCase, selectTargetUseCase, makeDecisionUseCase
   * - turnFlowService 需要 autoActionUseCase
   * - 這些 Use Cases 需要 turnFlowService 來設定超時回調
   *
   * 解決方案：使用 Setter Injection
   */

  // 建立 Use Cases（不含 turnFlowService）
  const playHandCardUseCase = new PlayHandCardUseCase(
    gameRepository,
    compositeEventPublisher,
    inMemoryGameStore,
    eventMapper,
    inMemoryGameLock,
    gameTimeoutManager,
    recordGameStatsUseCase,
    gameLogRepository
  )

  const selectTargetUseCase = new SelectTargetUseCase(
    gameRepository,
    compositeEventPublisher,
    inMemoryGameStore,
    eventMapper,
    inMemoryGameLock,
    gameTimeoutManager,
    recordGameStatsUseCase,
    gameLogRepository
  )

  const makeDecisionUseCase = new MakeDecisionUseCase(
    gameRepository,
    compositeEventPublisher,
    inMemoryGameStore,
    eventMapper,
    inMemoryGameLock,
    gameTimeoutManager,
    recordGameStatsUseCase,
    gameLogRepository
  )

  // 建立 GameStartService（共用邏輯）
  const gameStartService = new GameStartService(
    gameRepository,
    compositeEventPublisher,
    inMemoryGameStore,
    eventMapper,
    gameTimeoutManager,
    gameLogRepository
  )

  const joinGameUseCase = new JoinGameUseCase(
    gameRepository,
    compositeEventPublisher,
    inMemoryGameStore,
    eventMapper,
    internalEventBus,
    inMemoryGameLock,
    gameTimeoutManager,
    gameLogRepository,
    gameStartService
  )

  const joinGameAsAiUseCase = new JoinGameAsAiUseCase(
    inMemoryGameStore,
    inMemoryGameLock,
    gameStartService
  )

  // 建立 AutoActionUseCase
  const autoActionUseCase: AutoActionInputPort = new AutoActionUseCase(
    inMemoryGameStore,
    playHandCardUseCase,
    selectTargetUseCase,
    makeDecisionUseCase
  )

  // 建立 TurnFlowService
  const turnFlowService = new TurnFlowService(
    gameTimeoutManager,
    autoActionUseCase,
    inMemoryGameStore,
    gameRepository,
    compositeEventPublisher,
    eventMapper,
    inMemoryGameLock,
    recordGameStatsUseCase
  )

  // 注入 TurnFlowService 到需要它的 Use Cases 和 Services（Setter Injection）
  playHandCardUseCase.setTurnFlowService(turnFlowService)
  selectTargetUseCase.setTurnFlowService(turnFlowService)
  makeDecisionUseCase.setTurnFlowService(turnFlowService)
  gameStartService.setTurnFlowService(turnFlowService)

  // 建立 ConfirmContinueUseCase（依賴 turnFlowService）
  const confirmContinueUseCase: ConfirmContinueInputPort = new ConfirmContinueUseCase(
    inMemoryGameStore,
    turnFlowService,
    inMemoryGameLock
  )

  // 註冊剩餘的 Use Cases
  diContainer.register(BACKEND_TOKENS.PlayHandCardInputPort, () => playHandCardUseCase, { singleton: true })
  diContainer.register(BACKEND_TOKENS.SelectTargetInputPort, () => selectTargetUseCase, { singleton: true })
  diContainer.register(BACKEND_TOKENS.MakeDecisionInputPort, () => makeDecisionUseCase, { singleton: true })
  diContainer.register(BACKEND_TOKENS.JoinGameInputPort, () => joinGameUseCase, { singleton: true })
  diContainer.register(BACKEND_TOKENS.JoinGameAsAiInputPort, () => joinGameAsAiUseCase, { singleton: true })
  diContainer.register(BACKEND_TOKENS.AutoActionInputPort, () => autoActionUseCase, { singleton: true })
  diContainer.register(BACKEND_TOKENS.ConfirmContinueInputPort, () => confirmContinueUseCase, { singleton: true })

  // ===== 4. 註冊 Application Services =====
  diContainer.register(BACKEND_TOKENS.TurnFlowService, () => turnFlowService, { singleton: true })

  return diContainer
}

/**
 * 全域容器實例
 */
export const container = createBackendContainer()

// 匯出 BACKEND_TOKENS 供 API 端點使用
export { BACKEND_TOKENS }

// ===== 型別安全的 resolve 便捷函數 =====

/**
 * 型別安全的 resolve 函數
 *
 * 由於 TypeScript 無法自動推斷 Symbol token 對應的型別，
 * 需要在調用時明確指定泛型參數。
 *
 * @example
 * ```typescript
 * const joinGameUseCase = resolve<JoinGameInputPort>(BACKEND_TOKENS.JoinGameInputPort)
 * const gameStore = resolve<GameStorePort>(BACKEND_TOKENS.GameStore)
 * ```
 */
export function resolve<T>(token: symbol): T {
  return container.resolve(token) as T
}
