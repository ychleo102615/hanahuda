/**
 * Lobby Page Middleware - 大廳頁面中間件
 *
 * @description
 * 防止使用者在不適當的情況下進入大廳。
 *
 * 規則：
 * - 若 SessionContext 有活躍的會話（gameId 存在），代表遊戲會話已建立
 *   → 重定向至 /game（可能是重連或誤導航）
 * - 否則允許進入大廳
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

  // 若遊戲會話已建立，重定向至遊戲畫面
  if (sessionContext.hasActiveSession()) {
    console.warn('[Middleware] 遊戲會話已存在，重定向至 /game', {
      gameId: sessionContext.getGameId(),
      from: from.path,
    })
    return navigateTo('/game')
  }

  console.info('[Middleware] 進入大廳頁面', { from: from.path })
})
