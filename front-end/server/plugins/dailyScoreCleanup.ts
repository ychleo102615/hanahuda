/**
 * Daily Score Cleanup Plugin
 *
 * @description
 * 定期清理超過 30 天的每日玩家分數記錄。
 * 透過 Nitro plugin 在伺服器啟動時初始化定時清理任務。
 *
 * @module server/plugins/dailyScoreCleanup
 */

import { lt, sql } from 'drizzle-orm'
import { db } from '~~/server/utils/db'
import { dailyPlayerScores } from '~~/server/database/schema/dailyPlayerScores'
import { getDateString } from '~~/server/leaderboard/domain/statistics/time-range'

/**
 * 資料保留天數
 */
const RETENTION_DAYS = 30

/**
 * 清理間隔（毫秒）- 每 24 小時執行一次
 */
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000

/**
 * 計算 30 天前的日期字串 (YYYY-MM-DD)
 */
function getRetentionCutoffDate(): string {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS)
  return getDateString(cutoffDate)
}

/**
 * 執行清理：刪除超過保留期限的記錄
 */
async function cleanupOldRecords(): Promise<number> {
  const cutoffDateString = getRetentionCutoffDate()

  const result = await db
    .delete(dailyPlayerScores)
    .where(lt(dailyPlayerScores.date, cutoffDateString))
    .returning({ deletedId: sql`1` })

  return result.length
}

/**
 * 定時清理任務
 */
async function runCleanupJob(): Promise<void> {
  try {
    const deletedCount = await cleanupOldRecords()
    if (deletedCount > 0) {
      console.log(`[DailyScoreCleanup] Cleaned up ${deletedCount} records older than ${RETENTION_DAYS} days`)
    }
  }
  catch (error) {
    console.error('[DailyScoreCleanup] Cleanup job failed:', error)
  }
}

export default defineNitroPlugin(() => {
  // 初始延遲：伺服器啟動後 1 分鐘執行第一次清理
  const INITIAL_DELAY_MS = 60 * 1000

  // 設定定時任務
  setTimeout(() => {
    // 立即執行一次清理
    runCleanupJob()

    // 設定週期性清理
    setInterval(runCleanupJob, CLEANUP_INTERVAL_MS)
  }, INITIAL_DELAY_MS)

  console.log('[DailyScoreCleanup] Plugin initialized. Cleanup will run every 24 hours.')
})
