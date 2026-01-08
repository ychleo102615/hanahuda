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
import { useGameStateStore } from '~/user-interface/adapter/stores/gameState'

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

  // 從 SessionContext 檢查是否有房間選擇
  const sessionContext = useDependency<SessionContextPort>(TOKENS.SessionContextPort)

  // SSE-First 架構：檢查是否有房間選擇資訊（roomTypeId）
  if (!sessionContext.hasRoomSelection()) {
    return navigateTo('/lobby')
  }

  // 如果遊戲已結束，清除 session 並返回大廳
  const gameState = useGameStateStore()
  if (gameState.gameEnded) {
    sessionContext.clearSession()
    return navigateTo('/lobby')
  }

  // gameMode 由 DI Plugin 透過 runtimeConfig 取得，不在此處理
})
