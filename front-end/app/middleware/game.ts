/**
 * Game Page Middleware - 遊戲頁面中間件
 *
 * @description
 * 路由守衛：檢查是否有有效的遊戲會話，若無則重定向至大廳。
 *
 * 注意：遊戲模式（gameMode）不在此處理，由 DI Plugin 透過 runtimeConfig 統一管理。
 */

import { useDependency } from '~/user-interface/adapter/composables/useDependency'
import { TOKENS } from '~/user-interface/adapter/di/tokens'
import type { SessionContextPort } from '~/user-interface/application/ports/output/session-context.port'
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
  const sessionContext = useDependency<SessionContextPort>(TOKENS.SessionContextPort)

  // 檢查是否正在配對中或已有遊戲（使用持久化的 sessionStorage）
  // - isMatchmakingMode(): 有 entryId（配對中）
  // - hasActiveGame(): 有 currentGameId（遊戲中）
  // 注意：使用 sessionContext 而非 gameState，因為頁面刷新後 Pinia store 會被重置
  if (!sessionContext.isMatchmakingMode() && !sessionContext.hasActiveGame()) {
    return navigateTo('/lobby')
  }

  // gameMode 由 DI Plugin 透過 runtimeConfig 取得，不在此處理
})
