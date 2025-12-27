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

export default defineNuxtRouteMiddleware((to, from) => {
  // Nuxt 4: 只在 client-side 執行
  if (import.meta.server) {
    return
  }

  // 從 SessionContext 檢查是否有活躍的遊戲會話
  const sessionContext = useDependency<SessionContextPort>(TOKENS.SessionContextPort)


  // SSE-First 架構：檢查是否有房間選擇資訊（playerId + roomTypeId）
  // 而非 hasActiveSession()（playerId + gameId），因為 gameId 要等 SSE 連線後才會有
  if (!sessionContext.hasRoomSelection()) {
    return navigateTo('/lobby')
  }

  // 如果遊戲已結束，清除 session 並返回大廳
  if (sessionContext.isGameFinished()) {
    sessionContext.clearIdentity()
    return navigateTo('/lobby')
  }

  // gameMode 由 DI Plugin 透過 runtimeConfig 取得，不在此處理
})
