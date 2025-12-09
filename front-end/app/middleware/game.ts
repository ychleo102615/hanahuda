/**
 * Game Page Middleware - 遊戲頁面中間件
 *
 * @description
 * 路由守衛：檢查是否有有效的遊戲會話，若無則重定向至大廳。
 *
 * 注意：遊戲模式（gameMode）不在此處理，由 DI Plugin 透過 runtimeConfig 統一管理。
 */

import { useGameStateStore } from '~/user-interface/adapter/stores/gameState'

export default defineNuxtRouteMiddleware((to, from) => {
  // Nuxt 4: 只在 client-side 執行
  if (import.meta.server) {
    return
  }

  const gameState = useGameStateStore()

  console.info('[Middleware] 進入遊戲頁面', { from: from.path })

  if (!gameState.gameId) {
    console.warn('[Middleware] 無遊戲會話，重定向至 /lobby')
    return navigateTo('/lobby')
  }

  // gameMode 由 DI Plugin 透過 runtimeConfig 取得，不在此處理
})
