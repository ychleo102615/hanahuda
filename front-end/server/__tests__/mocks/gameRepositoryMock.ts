/**
 * GameRepository Mock
 *
 * @description
 * GameRepositoryPort 的測試用 mock 實作。
 * 提供可配置的 mock 函數以驗證持久化行為。
 *
 * @module server/__tests__/mocks/gameRepositoryMock
 */

import { vi } from 'vitest'
import type { GameRepositoryPort } from '~/server/application/ports/output/gameRepositoryPort'
import type { Game, GameStatus } from '~/server/domain/game/game'

/**
 * GameRepository Mock 類型
 */
export type MockGameRepository = {
  [K in keyof GameRepositoryPort]: ReturnType<typeof vi.fn>
}

/**
 * 建立 GameRepository Mock
 *
 * @returns 可配置的 GameRepository mock
 */
export function createMockGameRepository(): MockGameRepository {
  return {
    save: vi.fn<(game: Game) => Promise<void>>().mockResolvedValue(undefined),
    findById: vi.fn<(gameId: string) => Promise<Game | null>>().mockResolvedValue(null),
    findBySessionToken: vi.fn<(sessionToken: string) => Promise<Game | null>>().mockResolvedValue(null),
    findByPlayerId: vi.fn<(playerId: string) => Promise<Game | null>>().mockResolvedValue(null),
    updateStatus: vi.fn<(gameId: string, status: GameStatus) => Promise<void>>().mockResolvedValue(undefined),
    delete: vi.fn<(gameId: string) => Promise<void>>().mockResolvedValue(undefined),
    findWaitingGame: vi.fn<() => Promise<Game | null>>().mockResolvedValue(null),
  }
}

/**
 * 建立預設返回遊戲的 GameRepository Mock
 *
 * @param game - 要返回的遊戲狀態
 * @returns 配置好的 GameRepository mock
 */
export function createMockGameRepositoryWithGame(game: Game): MockGameRepository {
  const mock = createMockGameRepository()
  mock.findById.mockResolvedValue(game)
  mock.findBySessionToken.mockResolvedValue(game)
  mock.findByPlayerId.mockResolvedValue(game)
  return mock
}
