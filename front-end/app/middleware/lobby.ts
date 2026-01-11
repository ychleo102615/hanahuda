/**
 * Lobby Page Middleware - 大廳頁面中間件
 *
 * @description
 * 防止使用者在不適當的情況下進入大廳。
 *
 * 規則：
 * - 若 GameState 有活躍的遊戲（currentGameId 存在），代表遊戲會話已建立
 *   → 重定向至 /game（可能是重連或誤導航）
 * - 否則允許進入大廳
 */

import { useGameStateStore } from '~/game-client/adapter/stores/gameState'

export default defineNuxtRouteMiddleware((_to, _from) => {
  // Nuxt 4: 只在 client-side 執行
  if (import.meta.server) {
    return
  }

  // 從 GameState 檢查是否有活躍的遊戲會話
  const gameState = useGameStateStore()

  // 若遊戲會話已建立，重定向至遊戲畫面
  if (gameState.currentGameId) {
    return navigateTo('/game')
  }

})
