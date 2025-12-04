/**
 * Lobby Page Middleware - 大廳頁面中間件
 *
 * @description
 * 防止使用者在不適當的情況下進入大廳。
 *
 * 規則：
 * - 若 gameState 已初始化（game_id 存在），代表遊戲會話已建立
 *   → 重定向至 /game（可能是重連或誤導航）
 * - 否則允許進入大廳
 */

import { useGameStateStore } from '~/user-interface/adapter/stores/gameState'

export default defineNuxtRouteMiddleware((to, from) => {
  // Nuxt 4: 只在 client-side 執行
  if (import.meta.server) {
    return
  }

  const gameState = useGameStateStore()

  // 若遊戲會話已建立，重定向至遊戲畫面
  if (gameState.gameId) {
    console.warn('[Middleware] 遊戲會話已存在，重定向至 /game', {
      gameId: gameState.gameId,
      from: from.path,
    })
    return navigateTo('/game')
  }

  console.info('[Middleware] 進入大廳頁面', { from: from.path })
})
