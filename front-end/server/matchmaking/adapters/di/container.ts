/**
 * Matchmaking BC Dependency Injection Container
 *
 * @description
 * 管理 Matchmaking BC 的依賴注入。
 * 提供 Use Cases 與 Adapters 的工廠函數。
 *
 * @module server/matchmaking/adapters/di/container
 */

import { EnterMatchmakingUseCase } from '../../application/use-cases/enterMatchmakingUseCase'
import { ProcessMatchmakingUseCase } from '../../application/use-cases/processMatchmakingUseCase'
import { getInMemoryMatchmakingPool } from '../persistence/inMemoryMatchmakingPool'
import { getMatchmakingEventBusAdapter } from '../event-publisher/matchmakingEventBusAdapter'
import { getPlayerGameStatusAdapter } from '~~/server/core-game/adapters/query/playerGameStatusAdapter'
import type { EnterMatchmakingInputPort } from '../../application/ports/input/enterMatchmakingInputPort'

// =============================================================================
// Container Interface
// =============================================================================

/**
 * Matchmaking BC Container
 */
export interface MatchmakingContainer {
  // Use Cases
  enterMatchmakingUseCase: EnterMatchmakingInputPort
  processMatchmakingUseCase: ProcessMatchmakingUseCase
}

// =============================================================================
// Container Factory
// =============================================================================

let container: MatchmakingContainer | null = null

/**
 * 建立或取得 Matchmaking Container
 *
 * 使用單例模式確保整個應用程式使用相同的依賴
 */
export function getMatchmakingContainer(): MatchmakingContainer {
  if (container) {
    return container
  }

  // 取得 Adapters
  const poolPort = getInMemoryMatchmakingPool()
  const eventPublisher = getMatchmakingEventBusAdapter()
  const playerGameStatusPort = getPlayerGameStatusAdapter()

  // 建立 Use Cases
  const enterMatchmakingUseCase = new EnterMatchmakingUseCase(
    poolPort,
    playerGameStatusPort,
    eventPublisher
  )

  const processMatchmakingUseCase = new ProcessMatchmakingUseCase(
    poolPort,
    eventPublisher
  )

  container = {
    enterMatchmakingUseCase,
    processMatchmakingUseCase,
  }

  return container
}

/**
 * 重置 Container（僅用於測試）
 */
export function resetMatchmakingContainer(): void {
  container = null
}
