/**
 * Health Check Endpoint
 *
 * @description
 * 提供伺服器健康狀態檢查。
 * 用於負載平衡器、監控系統和部署驗證。
 *
 * @route GET /api/health
 */

import { inMemoryGameStore } from '~~/server/core-game/adapters/persistence/inMemoryGameStore'
import { connectionStore } from '~~/server/core-game/adapters/event-publisher/connectionStore'

/**
 * 健康檢查回應
 */
interface HealthResponse {
  readonly status: 'ok' | 'degraded' | 'error'
  readonly timestamp: string
  readonly uptime: number
  readonly memory: {
    readonly heapUsed: number
    readonly heapTotal: number
    readonly external: number
  }
  readonly games: {
    readonly active: number
    readonly connections: number
  }
}

/**
 * 伺服器啟動時間
 */
const startTime = Date.now()

/**
 * 健康檢查處理器
 */
export default defineEventHandler((): HealthResponse => {
  const memoryUsage = process.memoryUsage()

  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
    memory: {
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      external: Math.round(memoryUsage.external / 1024 / 1024),
    },
    games: {
      active: inMemoryGameStore.getCount(),
      connections: connectionStore.getTotalConnectionCount(),
    },
  }
})
