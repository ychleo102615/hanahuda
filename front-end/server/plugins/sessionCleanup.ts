/**
 * Session Cleanup Scheduler Plugin
 *
 * @description
 * Nitro Plugin，定期清理過期的 Session 資料。
 * 防止記憶體與資料庫無限增長。
 *
 * 清理策略：
 * - 每 30 分鐘執行一次清理
 * - 清理 expiresAt 已過期的 Session
 */

import { getIdentityContainer } from '~~/server/identity/adapters/di/container'
import { logger } from '~~/server/utils/logger'

/** 清理間隔（毫秒）：30 分鐘 */
const CLEANUP_INTERVAL_MS = 30 * 60 * 1000

/** 清理計時器 ID */
let cleanupTimer: ReturnType<typeof setInterval> | null = null

/**
 * 執行 Session 清理
 */
async function performCleanup(): Promise<void> {
  try {
    const deletedCount = await getIdentityContainer().sessionMaintenance.cleanupExpired()

    logger.info('[SessionCleanup] Cleanup completed', {
      deletedCount,
    })
  } catch (error) {
    logger.error('[SessionCleanup] Cleanup failed', {
      error: error instanceof Error ? error.message : String(error),
    })
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
