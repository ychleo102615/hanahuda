/**
 * PlayerIdentityPort Mock
 *
 * @description
 * 提供測試用的 PlayerIdentityPort 模擬實作。
 * 用於模擬 Identity BC 的玩家身份驗證。
 *
 * @module server/__tests__/mocks/playerIdentityPortMock
 */

import { vi, type Mock } from 'vitest'
import type { H3Event } from 'h3'
import { PlayerIdentityPort } from '~~/server/core-game/application/ports/output/playerIdentityPort'

export interface MockPlayerIdentityPort extends PlayerIdentityPort {
  getPlayerIdFromRequest: Mock<[H3Event], Promise<string | null>>
}

/**
 * 建立 PlayerIdentityPort mock
 *
 * @description
 * 預設行為：返回 null（無有效 session）。
 * 使用 setPlayerId() 輔助函數來設定返回的 playerId。
 *
 * @example
 * ```ts
 * const mock = createMockPlayerIdentityPort()
 * setPlayerIdForMock(mock, 'player-123')
 * // 現在 mock.getPlayerIdFromRequest() 會返回 'player-123'
 * ```
 */
export function createMockPlayerIdentityPort(): MockPlayerIdentityPort {
  const mock = {
    getPlayerIdFromRequest: vi.fn<[H3Event], Promise<string | null>>().mockResolvedValue(null),
  }
  return mock as MockPlayerIdentityPort
}

/**
 * 設定 mock 返回特定的 playerId
 *
 * @param mock - PlayerIdentityPort mock
 * @param playerId - 要返回的 playerId（null 表示無有效 session）
 */
export function setPlayerIdForMock(mock: MockPlayerIdentityPort, playerId: string | null): void {
  mock.getPlayerIdFromRequest.mockResolvedValue(playerId)
}

/**
 * 建立已設定 playerId 的 PlayerIdentityPort mock
 *
 * @param playerId - 要返回的 playerId
 * @returns 設定好的 mock
 */
export function createMockPlayerIdentityPortWithPlayer(playerId: string): MockPlayerIdentityPort {
  const mock = createMockPlayerIdentityPort()
  setPlayerIdForMock(mock, playerId)
  return mock
}
