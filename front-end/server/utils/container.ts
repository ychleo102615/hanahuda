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

// Adapters - Event Publisher
import { internalEventBus } from '~~/server/adapters/event-publisher/internalEventBus'
import { opponentEventBus } from '~~/server/adapters/event-publisher/opponentEventBus'
import { createSSEEventPublisher } from '~~/server/adapters/event-publisher/sseEventPublisher'

// Adapters - Mappers
import { eventMapper } from '~~/server/adapters/mappers/eventMapper'

// Adapters - Timeout
import { actionTimeoutManager } from '~~/server/adapters/timeout/actionTimeoutManager'
import { displayTimeoutManager } from '~~/server/adapters/timeout/displayTimeoutManager'

// Use Cases
import { JoinGameUseCase } from '~~/server/application/use-cases/joinGameUseCase'
import { PlayHandCardUseCase } from '~~/server/application/use-cases/playHandCardUseCase'
import { SelectTargetUseCase } from '~~/server/application/use-cases/selectTargetUseCase'
import { MakeDecisionUseCase } from '~~/server/application/use-cases/makeDecisionUseCase'
import { LeaveGameUseCase } from '~~/server/application/use-cases/leaveGameUseCase'

// Input Port Types
import type { JoinGameInputPort } from '~~/server/application/ports/input/joinGameInputPort'
import type { PlayHandCardInputPort } from '~~/server/application/ports/input/playHandCardInputPort'
import type { SelectTargetInputPort } from '~~/server/application/ports/input/selectTargetInputPort'
import type { MakeDecisionInputPort } from '~~/server/application/ports/input/makeDecisionInputPort'
import type { LeaveGameInputPort } from '~~/server/application/ports/input/leaveGameInputPort'

/**
 * 建立 SSEEventPublisher（需要 gameStore）
 */
const sseEventPublisher = createSSEEventPublisher(inMemoryGameStore)

/**
 * 建立 Use Cases（實作 Input Ports）
 */
const joinGameUseCase: JoinGameInputPort = new JoinGameUseCase(
  gameRepository,
  sseEventPublisher,
  inMemoryGameStore,
  eventMapper,
  internalEventBus
)

const playHandCardUseCase: PlayHandCardInputPort = new PlayHandCardUseCase(
  gameRepository,
  sseEventPublisher,
  inMemoryGameStore,
  eventMapper
)

const selectTargetUseCase: SelectTargetInputPort = new SelectTargetUseCase(
  gameRepository,
  sseEventPublisher,
  inMemoryGameStore,
  eventMapper
)

const makeDecisionUseCase: MakeDecisionInputPort = new MakeDecisionUseCase(
  gameRepository,
  sseEventPublisher,
  inMemoryGameStore,
  eventMapper
)

const leaveGameUseCase: LeaveGameInputPort = new LeaveGameUseCase(
  gameRepository,
  sseEventPublisher,
  inMemoryGameStore,
  eventMapper
)

/**
 * 容器匯出
 *
 * 提供所有依賴的單例存取
 */
export const container = {
  // Adapters
  gameStore: inMemoryGameStore,
  gameRepository,
  sseEventPublisher,
  eventMapper,
  internalEventBus,
  opponentEventBus,
  actionTimeoutManager,
  displayTimeoutManager,

  // Use Cases (Input Ports)
  joinGameUseCase,
  playHandCardUseCase,
  selectTargetUseCase,
  makeDecisionUseCase,
  leaveGameUseCase,
} as const
