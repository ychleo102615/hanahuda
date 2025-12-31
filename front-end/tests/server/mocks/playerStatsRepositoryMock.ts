/**
 * PlayerStatsRepository Mock
 *
 * @description
 * PlayerStatsRepositoryPort 的測試用 mock 實作。
 * 提供可配置的 mock 函數以驗證玩家統計持久化行為。
 *
 * @module server/__tests__/mocks/playerStatsRepositoryMock
 */

import { vi } from 'vitest'
import type {
  PlayerStatsRepositoryPort,
  UpsertPlayerStatsInput,
} from '~/server/application/ports/output/playerStatsRepositoryPort'
import type { PlayerStat } from '~/server/database/schema/playerStats'

/**
 * PlayerStatsRepository Mock 類型
 */
export type MockPlayerStatsRepository = {
  [K in keyof PlayerStatsRepositoryPort]: ReturnType<typeof vi.fn>
}

/**
 * 建立 PlayerStatsRepository Mock
 *
 * @returns 可配置的 PlayerStatsRepository mock
 */
export function createMockPlayerStatsRepository(): MockPlayerStatsRepository {
  return {
    findByPlayerId: vi.fn<(playerId: string) => Promise<PlayerStat | null>>().mockResolvedValue(null),
    upsert: vi.fn<(input: UpsertPlayerStatsInput) => Promise<void>>().mockResolvedValue(undefined),
  }
}

/**
 * 建立預設返回統計的 PlayerStatsRepository Mock
 *
 * @param stats - 要返回的玩家統計
 * @returns 配置好的 PlayerStatsRepository mock
 */
export function createMockPlayerStatsRepositoryWithStats(stats: PlayerStat): MockPlayerStatsRepository {
  const mock = createMockPlayerStatsRepository()
  mock.findByPlayerId.mockResolvedValue(stats)
  return mock
}

/**
 * 取得所有 upsert 呼叫的輸入
 *
 * @param mock - PlayerStatsRepository mock
 * @returns 所有 upsert 呼叫的輸入參數
 */
export function getUpsertCalls(mock: MockPlayerStatsRepository): UpsertPlayerStatsInput[] {
  return mock.upsert.mock.calls.map((call) => call[0] as UpsertPlayerStatsInput)
}
