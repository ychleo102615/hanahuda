/**
 * Game Page Middleware - 遊戲頁面中間件
 *
 * @description
 * 路由守衛：檢查是否有有效的遊戲會話，若無則重定向至大廳。
 *
 * 允許進入 Game 頁面的條件（任一）：
 * - pendingRoomTypeId: 從 Lobby 點擊房間卡片，準備開始配對
 * - isMatchmakingMode: 有 entryId（配對中）
 * - hasActiveGame: 有 currentGameId（遊戲中）
 *
 * 注意：遊戲模式（gameMode）不在此處理，由 DI Plugin 透過 runtimeConfig 統一管理。
 */

import { resolveDependency } from '~/game-client/adapter/di/resolver'
import { TOKENS } from '~/game-client/adapter/di/tokens'
import type { SessionContextPort } from '~/game-client/application/ports/output/session-context.port'
import { useAuthStore } from '~/identity/adapter/stores/auth-store'

export default defineNuxtRouteMiddleware((_to, _from) => {
  // Nuxt 4: 只在 client-side 執行
  if (import.meta.server) {
    return
  }

  // 從 authStore 檢查是否已登入
  const authStore = useAuthStore()
  if (!authStore.isLoggedIn) {
    return navigateTo('/lobby')
  }

  // 從 SessionContext 檢查是否有有效會話
  const sessionContext = resolveDependency<SessionContextPort>(TOKENS.SessionContextPort)

  // 檢查是否有進入 Game 頁面的理由（使用持久化的 sessionStorage）
  // - getPendingRoomTypeId(): 從 Lobby 點擊房間，準備開始配對
  // - isMatchmakingMode(): 有 entryId（配對中）
  // - hasActiveGame(): 有 currentGameId（遊戲中）
  // 注意：使用 sessionContext 而非 gameState，因為頁面刷新後 Pinia store 會被重置
  const hasPendingMatchmaking = sessionContext.getPendingRoomTypeId() !== null
  const isInMatchmaking = sessionContext.isMatchmakingMode()
  const hasActiveGame = sessionContext.hasActiveGame()

  if (!hasPendingMatchmaking && !isInMatchmaking && !hasActiveGame) {
    return navigateTo('/lobby')
  }

  // gameMode 由 DI Plugin 透過 runtimeConfig 取得，不在此處理
})
