/**
 * Dependency Container - Composition Root
 *
 * @description
 * 依賴注入容器，管理所有單例依賴。
 * 這是應用程式的組合根（Composition Root），負責建立和組裝所有依賴。
 *
 * 設計原則：
 * - 所有依賴都在這裡建立和組裝
 * - API 端點和 Plugin 都從這裡取得依賴
 * - 確保 Use Cases 和 Services 使用相同的實例
 *
 * @module server/utils/container
 */

// Adapters - Persistence
import { inMemoryGameStore } from '~~/server/adapters/persistence/inMemoryGameStore'
import { gameRepository } from '~~/server/adapters/persistence/drizzleGameRepository'
import { playerStatsRepository } from '~~/server/adapters/persistence/drizzlePlayerStatsRepository'

// Adapters - Event Publisher
import { internalEventBus } from '~~/server/adapters/event-publisher/internalEventBus'
import { createCompositeEventPublisher } from '~~/server/adapters/event-publisher/compositeEventPublisher'

// Adapters - Mappers
import { eventMapper } from '~~/server/adapters/mappers/eventMapper'

// Adapters - Timeout
import { gameTimeoutManager } from '~~/server/adapters/timeout/gameTimeoutManager'

// Use Cases
import { JoinGameUseCase } from '~~/server/application/use-cases/joinGameUseCase'
import { JoinGameAsAiUseCase } from '~~/server/application/use-cases/joinGameAsAiUseCase'
import { PlayHandCardUseCase } from '~~/server/application/use-cases/playHandCardUseCase'
import { SelectTargetUseCase } from '~~/server/application/use-cases/selectTargetUseCase'
import { MakeDecisionUseCase } from '~~/server/application/use-cases/makeDecisionUseCase'
import { LeaveGameUseCase } from '~~/server/application/use-cases/leaveGameUseCase'
import { AutoActionUseCase } from '~~/server/application/use-cases/autoActionUseCase'
import { RecordGameStatsUseCase } from '~~/server/application/use-cases/recordGameStatsUseCase'

// Input Port Types
import type { JoinGameInputPort } from '~~/server/application/ports/input/joinGameInputPort'
import type { JoinGameAsAiInputPort } from '~~/server/application/ports/input/joinGameAsAiInputPort'
import type { PlayHandCardInputPort } from '~~/server/application/ports/input/playHandCardInputPort'
import type { SelectTargetInputPort } from '~~/server/application/ports/input/selectTargetInputPort'
import type { MakeDecisionInputPort } from '~~/server/application/ports/input/makeDecisionInputPort'
import type { LeaveGameInputPort } from '~~/server/application/ports/input/leaveGameInputPort'
import type { AutoActionInputPort } from '~~/server/application/ports/input/autoActionInputPort'
import type { RecordGameStatsInputPort } from '~~/server/application/ports/input/recordGameStatsInputPort'

/**
 * 建立 CompositeEventPublisher
 */
const compositeEventPublisher = createCompositeEventPublisher()

/**
 * 建立 Use Cases（實作 Input Ports）
 */
/**
 * 建立 RecordGameStatsUseCase（無循環依賴）
 */
const recordGameStatsUseCase: RecordGameStatsInputPort = new RecordGameStatsUseCase(
  playerStatsRepository
)

const joinGameUseCase: JoinGameInputPort = new JoinGameUseCase(
  gameRepository,
  compositeEventPublisher,
  inMemoryGameStore,
  eventMapper,
  internalEventBus,
  gameTimeoutManager,
  { execute: (input) => getAutoActionUseCase().execute(input) }
)

const joinGameAsAiUseCase: JoinGameAsAiInputPort = new JoinGameAsAiUseCase(
  gameRepository,
  compositeEventPublisher,
  inMemoryGameStore,
  eventMapper,
  gameTimeoutManager,
  { execute: (input) => getAutoActionUseCase().execute(input) }
)

const leaveGameUseCase: LeaveGameInputPort = new LeaveGameUseCase(
  gameRepository,
  compositeEventPublisher,
  inMemoryGameStore,
  eventMapper,
  recordGameStatsUseCase
)

/**
 * 解決循環依賴：
 * - autoActionUseCase 需要 playHandCardUseCase, selectTargetUseCase, makeDecisionUseCase
 * - 這些 Use Cases 需要 autoActionUseCase 來設定超時回調
 *
 * 解決方案：使用 Proxy 模式延遲取得依賴
 */

// 延遲取得 autoActionUseCase 的 holder
let _autoActionUseCase: AutoActionInputPort | null = null
const getAutoActionUseCase = (): AutoActionInputPort => {
  if (!_autoActionUseCase) {
    throw new Error('AutoActionUseCase not initialized yet')
  }
  return _autoActionUseCase
}

// 建立帶有超時功能的 Use Cases
const playHandCardUseCase: PlayHandCardInputPort = new PlayHandCardUseCase(
  gameRepository,
  compositeEventPublisher,
  inMemoryGameStore,
  eventMapper,
  gameTimeoutManager,
  { execute: (input) => getAutoActionUseCase().execute(input) }
)

const selectTargetUseCase: SelectTargetInputPort = new SelectTargetUseCase(
  gameRepository,
  compositeEventPublisher,
  inMemoryGameStore,
  eventMapper,
  gameTimeoutManager,
  { execute: (input) => getAutoActionUseCase().execute(input) }
)

const makeDecisionUseCase: MakeDecisionInputPort = new MakeDecisionUseCase(
  gameRepository,
  compositeEventPublisher,
  inMemoryGameStore,
  eventMapper,
  gameTimeoutManager,
  { execute: (input) => getAutoActionUseCase().execute(input) },
  recordGameStatsUseCase
)

// 建立 autoActionUseCase（使用帶超時的 Use Cases）
const autoActionUseCase: AutoActionInputPort = new AutoActionUseCase(
  inMemoryGameStore,
  playHandCardUseCase,
  selectTargetUseCase,
  makeDecisionUseCase
)

// 初始化 holder
_autoActionUseCase = autoActionUseCase

/**
 * 容器匯出
 *
 * 提供所有依賴的單例存取
 */
export const container = {
  // Adapters
  gameStore: inMemoryGameStore,
  gameRepository,
  playerStatsRepository,
  eventPublisher: compositeEventPublisher,
  eventMapper,
  internalEventBus,
  gameTimeoutManager,

  // Use Cases (Input Ports)
  joinGameUseCase,
  joinGameAsAiUseCase,
  playHandCardUseCase,
  selectTargetUseCase,
  makeDecisionUseCase,
  leaveGameUseCase,
  autoActionUseCase,
  recordGameStatsUseCase,
} as const
