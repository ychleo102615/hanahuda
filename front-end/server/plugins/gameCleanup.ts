/**
 * Game Cleanup Scheduler Plugin
 *
 * @description
 * Nitro Plugin，在伺服器啟動時初始化遊戲清理排程器。
 * 定期清理記憶體中的陳舊遊戲，防止記憶體洩漏。
 *
 * ## 設計角色
 * 此插件是「安全網」機制，不是主要清理途徑：
 * - 主要清理：遊戲結束/配對超時時立即刪除（turnFlowService, joinGameUseCase）
 * - 安全網：捕獲因 bug 或異常情況漏網的遊戲
 *
 * ## 清理策略
 * - 每 5 分鐘執行一次清理
 * - 清理所有 updatedAt 超過 30 分鐘的遊戲
 * - IN_PROGRESS 遊戲被清理視為異常，會記錄警告日誌
 * - WAITING/FINISHED 遊戲被清理視為正常（安全網生效）
 */

import { inMemoryGameStore } from '~~/server/core-game/adapters/persistence/inMemoryGameStore'
import { logger } from '~~/server/utils/logger'

/** 清理間隔（毫秒）：5 分鐘 */
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000

/** 遊戲最大存活時間（毫秒）：30 分鐘 */
const MAX_GAME_AGE_MS = 30 * 60 * 1000

/** 清理計時器 ID */
let cleanupTimer: ReturnType<typeof setInterval> | null = null

/**
 * 執行遊戲清理
 *
 * @description
 * 清理所有陳舊遊戲並記錄日誌。
 * IN_PROGRESS 遊戲被清理視為異常情況（使用 warn 級別）。
 */
function performCleanup(): void {
  const cleaned = inMemoryGameStore.cleanupExpired(MAX_GAME_AGE_MS)

  for (const info of cleaned) {
    if (info.status === 'IN_PROGRESS') {
      // 異常情況：IN_PROGRESS 遊戲不應該這麼久沒更新
      logger.warn('Stale IN_PROGRESS game cleaned up (abnormal)', {
        gameId: info.gameId,
        staleDurationMinutes: Math.floor(info.staleDurationMs / 60000),
        playerIds: info.playerIds,
      })
    } else {
      // 正常情況：WAITING/FINISHED 遊戲被安全網捕獲
      logger.info('Stale game cleaned up', {
        gameId: info.gameId,
        status: info.status,
        staleDurationMinutes: Math.floor(info.staleDurationMs / 60000),
      })
    }
  }
}

export default defineNitroPlugin((nitroApp) => {
  // 避免重複初始化
  if (cleanupTimer) {
    return
  }

  // 啟動定期清理
  cleanupTimer = setInterval(performCleanup, CLEANUP_INTERVAL_MS)

  // 在伺服器關閉時清理計時器
  nitroApp.hooks.hook('close', () => {
    if (cleanupTimer) {
      clearInterval(cleanupTimer)
      cleanupTimer = null
    }
  })
})
