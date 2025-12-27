/**
 * Game Cleanup Scheduler Plugin
 *
 * @description
 * Nitro Plugin，在伺服器啟動時初始化遊戲清理排程器。
 * 定期清理過期的遊戲，防止記憶體洩漏。
 *
 * 清理策略：
 * - 每 5 分鐘執行一次清理
 * - 清理 updatedAt 超過 30 分鐘的非進行中遊戲
 * - IN_PROGRESS 狀態的遊戲不會被清理
 */

import { inMemoryGameStore } from '~~/server/adapters/persistence/inMemoryGameStore'

/** 清理間隔（毫秒）：5 分鐘 */
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000

/** 遊戲最大存活時間（毫秒）：30 分鐘 */
const MAX_GAME_AGE_MS = 30 * 60 * 1000

/** 清理計時器 ID */
let cleanupTimer: ReturnType<typeof setInterval> | null = null

/**
 * 執行遊戲清理
 */
function performCleanup(): void {
  inMemoryGameStore.cleanupExpired(MAX_GAME_AGE_MS)
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
