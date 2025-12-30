/**
 * Game Log Cleanup Scheduler Plugin
 *
 * @description
 * Nitro Plugin，在伺服器啟動時初始化 GameLog 清理排程器。
 * 定期清理過期的 game_logs 資料，防止資料庫無限增長。
 *
 * 清理策略：
 * - 每 1 小時執行一次清理
 * - 清理 createdAt 超過 7 天的日誌
 */

import { lt } from 'drizzle-orm'
import { db } from '~~/server/utils/db'
import { gameLogs } from '~~/server/database/schema'
import { logger } from '~~/server/utils/logger'

/** 清理間隔（毫秒）：1 小時 */
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000

/** 日誌保留天數：7 天 */
const RETENTION_DAYS = 7

/** 清理計時器 ID */
let cleanupTimer: ReturnType<typeof setInterval> | null = null

/**
 * 執行 GameLog 清理
 */
async function performCleanup(): Promise<void> {
  try {
    const cutoffDate = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000)
    const deleted = await db
      .delete(gameLogs)
      .where(lt(gameLogs.createdAt, cutoffDate))
      .returning({ id: gameLogs.id })

    // 只在有刪除時記錄
    if (deleted.length > 0) {
      logger.info('GameLog cleanup completed', { deletedCount: deleted.length })
    }
  } catch {
    // 清理失敗不影響應用
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
