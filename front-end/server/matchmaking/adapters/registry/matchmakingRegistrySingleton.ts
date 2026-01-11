/**
 * Matchmaking Registry Singleton
 *
 * @description
 * 提供 MatchmakingRegistry 的單例存取。
 *
 * @module server/matchmaking/adapters/registry/matchmakingRegistrySingleton
 */

import { MatchmakingRegistry } from './matchmakingRegistry'
import { getInMemoryMatchmakingPool } from '../persistence/inMemoryMatchmakingPool'

/**
 * 單例實例
 */
let instance: MatchmakingRegistry | null = null

/**
 * 取得 MatchmakingRegistry 單例
 */
export function getMatchmakingRegistry(): MatchmakingRegistry {
  if (!instance) {
    const poolPort = getInMemoryMatchmakingPool()
    instance = new MatchmakingRegistry(poolPort)
  }
  return instance
}

/**
 * 重置單例（僅用於測試）
 */
export function resetMatchmakingRegistry(): void {
  if (instance) {
    instance.stop()
  }
  instance = null
}
