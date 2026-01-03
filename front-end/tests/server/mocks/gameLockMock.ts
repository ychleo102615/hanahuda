/**
 * GameLock Mock
 *
 * @description
 * 提供測試用的 GameLockPort 模擬實作。
 * 預設行為：直接執行操作（不實際鎖定）。
 *
 * @module server/__tests__/mocks/gameLockMock
 */

import { vi, type Mock } from 'vitest'
import type { GameLockPort } from '~~/server/core-game/application/ports/output/gameLockPort'

export interface MockGameLock extends GameLockPort {
  withLock: Mock
}

/**
 * 建立 GameLock mock
 *
 * @description
 * 預設行為：直接執行傳入的操作函數（透傳模式）。
 * 這樣測試可以專注於業務邏輯，而不需要關心鎖機制。
 */
export function createMockGameLock(): MockGameLock {
  return {
    withLock: vi.fn(async <T>(_gameId: string, operation: () => Promise<T>) => {
      return operation()
    }),
  }
}
