/**
 * GameTimeout Mock
 *
 * @description
 * GameTimeoutPort 的測試用 mock 實作。
 * 提供可配置的 mock 函數以驗證計時器行為。
 *
 * @module server/__tests__/mocks/gameTimeoutMock
 */

import { vi } from 'vitest'
import { GameTimeoutPort } from '~/server/application/ports/output/gameTimeoutPort'

/**
 * GameTimeout Mock 類型
 */
export type MockGameTimeout = {
  [K in keyof GameTimeoutPort]: ReturnType<typeof vi.fn>
}

/**
 * 建立 GameTimeout Mock
 *
 * @returns 可配置的 GameTimeout mock
 */
export function createMockGameTimeout(): MockGameTimeout {
  return {
    // 遊戲計時器
    startTimeout: vi.fn<(gameId: string, seconds: number, onTimeout: () => void) => void>(),
    clearTimeout: vi.fn<(gameId: string) => void>(),
    getRemainingSeconds: vi.fn<(gameId: string) => number | null>().mockReturnValue(null),

    // 斷線計時器
    startDisconnectTimeout: vi.fn<(gameId: string, playerId: string, onTimeout: () => void) => void>(),
    clearDisconnectTimeout: vi.fn<(gameId: string, playerId: string) => void>(),
    clearAllDisconnectTimeouts: vi.fn<(gameId: string) => void>(),
    hasDisconnectTimeout: vi.fn<(gameId: string, playerId: string) => boolean>().mockReturnValue(false),

    // 閒置計時器
    startIdleTimeout: vi.fn<(gameId: string, playerId: string, onTimeout: () => void) => void>(),
    resetIdleTimeout: vi.fn<(gameId: string, playerId: string) => void>(),
    clearIdleTimeout: vi.fn<(gameId: string, playerId: string) => void>(),
    clearAllIdleTimeouts: vi.fn<(gameId: string) => void>(),
    hasIdleTimeout: vi.fn<(gameId: string, playerId: string) => boolean>().mockReturnValue(false),

    // 確認繼續計時器
    startContinueConfirmationTimeout: vi.fn<(
      gameId: string,
      playerId: string,
      totalSeconds: number,
      onTimeout: () => void
    ) => void>(),
    clearContinueConfirmationTimeout: vi.fn<(gameId: string, playerId: string) => void>(),
    clearAllContinueConfirmationTimeouts: vi.fn<(gameId: string) => void>(),
    hasContinueConfirmationTimeout: vi.fn<(gameId: string, playerId: string) => boolean>().mockReturnValue(false),

    // 配對超時計時器
    startMatchmakingTimeout: vi.fn<(gameId: string, onTimeout: () => void) => void>(),
    clearMatchmakingTimeout: vi.fn<(gameId: string) => void>(),
    getMatchmakingRemainingSeconds: vi.fn<(gameId: string) => number | null>().mockReturnValue(null),

    // 遊戲層級清理
    clearAllForGame: vi.fn<(gameId: string) => void>(),
  }
}

/**
 * 模擬超時觸發
 *
 * @param mock - GameTimeout mock
 * @param gameId - 遊戲 ID
 */
export function triggerTimeout(mock: MockGameTimeout, gameId: string): void {
  const calls = mock.startTimeout.mock.calls
  const matchingCall = calls.find((call) => call[0] === gameId)
  if (matchingCall) {
    const onTimeout = matchingCall[2] as () => void
    onTimeout()
  }
}

/**
 * 模擬斷線超時觸發
 *
 * @param mock - GameTimeout mock
 * @param gameId - 遊戲 ID
 * @param playerId - 玩家 ID
 */
export function triggerDisconnectTimeout(mock: MockGameTimeout, gameId: string, playerId: string): void {
  const calls = mock.startDisconnectTimeout.mock.calls
  const matchingCall = calls.find((call) => call[0] === gameId && call[1] === playerId)
  if (matchingCall) {
    const onTimeout = matchingCall[2] as () => void
    onTimeout()
  }
}

/**
 * 模擬配對超時觸發
 *
 * @param mock - GameTimeout mock
 * @param gameId - 遊戲 ID
 */
export function triggerMatchmakingTimeout(mock: MockGameTimeout, gameId: string): void {
  const calls = mock.startMatchmakingTimeout.mock.calls
  const matchingCall = calls.find((call) => call[0] === gameId)
  if (matchingCall) {
    const onTimeout = matchingCall[1] as () => void
    onTimeout()
  }
}
