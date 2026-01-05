/**
 * GameStore Mock
 *
 * @description
 * GameStorePort 的測試用 mock 實作。
 * 提供可配置的 mock 函數以驗證 Use Case 行為。
 *
 * @module server/__tests__/mocks/gameStoreMock
 */

import { vi } from 'vitest'
import type { GameStorePort } from '~/server/core-game/application/ports/output/gameStorePort'
import type { Game } from '~/server/core-game/domain/game/game'

/**
 * GameStore Mock 類型
 */
export type MockGameStore = {
  [K in keyof GameStorePort]: ReturnType<typeof vi.fn>
}

/**
 * 建立 GameStore Mock
 *
 * @returns 可配置的 GameStore mock
 */
export function createMockGameStore(): MockGameStore {
  return {
    get: vi.fn<(gameId: string) => Game | undefined>(),
    set: vi.fn<(game: Game) => void>(),
    delete: vi.fn<(gameId: string) => void>(),
    getByPlayerId: vi.fn<(playerId: string) => Game | undefined>(),
    findWaitingGame: vi.fn<() => Game | undefined>(),
    addPlayerGame: vi.fn<(playerId: string, gameId: string) => void>(),
    removePlayerGame: vi.fn<(playerId: string) => void>(),
  }
}

/**
 * 建立預設返回遊戲的 GameStore Mock
 *
 * @param game - 要返回的遊戲狀態
 * @returns 配置好的 GameStore mock
 */
export function createMockGameStoreWithGame(game: Game): MockGameStore {
  const mock = createMockGameStore()
  mock.get.mockReturnValue(game)
  mock.getByPlayerId.mockReturnValue(game)
  return mock
}
