/**
 * Guest Cleanup Scheduler Plugin
 *
 * @description
 * Nitro Plugin，定期清理長時間未活躍的訪客資料 (FR-010a)。
 *
 * ## 清理策略
 * - 每小時執行一次清理檢查
 * - 刪除超過 90 天未活躍的訪客（is_guest = true 且 updated_at 過期）
 * - CASCADE 會自動刪除關聯的 sessions
 *
 * 參考: specs/010-player-account/data-model.md#9.1-訪客資料清理
 */

import { getIdentityContainer } from '~~/server/identity/adapters/di/container'
import { logger } from '~~/server/utils/logger'

/** 清理間隔（毫秒）：1 小時 */
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000

/** 訪客最大不活躍天數：90 天 */
const GUEST_INACTIVE_DAYS = 90

/** 清理計時器 ID */
let cleanupTimer: ReturnType<typeof setInterval> | null = null

/**
 * 執行訪客清理
 *
 * @description
 * 1. 軟刪除超過 90 天未活躍的訪客資料
 * 2. 硬刪除已軟刪除且無遊戲記錄的訪客（資料全白，無保留價值）
 */
async function performCleanup(): Promise<void> {
  try {
    const { playerRepository } = getIdentityContainer()

    // 步驟 1: 軟刪除長時間未活躍的訪客
    const softDeletedCount = await playerRepository.deleteInactiveGuests(GUEST_INACTIVE_DAYS)

    logger.info('[GuestCleanup] Soft-delete completed', {
      softDeletedCount,
      inactiveDays: GUEST_INACTIVE_DAYS,
    })

    // 步驟 2: 硬刪除已軟刪除且無遊戲記錄的訪客
    const hardDeletedCount = await playerRepository.hardDeleteGuestsWithoutGameLogs()

    logger.info('[GuestCleanup] Hard-delete completed', {
      hardDeletedCount,
    })
  } catch (error) {
    logger.error('[GuestCleanup] Cleanup failed', {
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
