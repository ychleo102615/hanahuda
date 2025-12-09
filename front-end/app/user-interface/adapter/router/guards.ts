/**
 * Router Guards - 路由守衛
 *
 * @description
 * 定義 Vue Router 的路由守衛,處理頁面導航邏輯。
 *
 * 守衛:
 * - gamePageGuard: 遊戲頁面守衛,檢查遊戲會話是否存在
 * - lobbyPageGuard: 大廳頁面守衛,防止遊戲會話已存在時進入大廳
 *
 * 注意: 遊戲模式（gameMode）不在此處理，由 DI Plugin 透過 runtimeConfig 統一管理。
 *
 * @deprecated 此檔案主要用於測試，實際路由守衛由 Nuxt middleware 處理。
 */

import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router'
import { useGameStateStore } from '../stores/gameState'

/**
 * 遊戲頁面守衛
 *
 * @description
 * 當進入遊戲頁面時,檢查是否有有效的遊戲會話。
 *
 * @param to - 目標路由
 * @param from - 來源路由
 * @param next - 導航控制函數
 *
 * @example
 * ```typescript
 * // 在 router/index.ts 中使用:
 * {
 *   path: '/game',
 *   component: GamePage,
 *   beforeEnter: gamePageGuard
 * }
 * ```
 */
export function gamePageGuard(
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext
): void {
  const gameState = useGameStateStore()

  console.info('[Router] 進入遊戲頁面', { from: from.path })

  if (!gameState.gameId) {
    console.warn('[Router] 無遊戲會話，重定向至 /lobby')
    next({ name: 'lobby' })
    return
  }

  // gameMode 由 DI Plugin 透過 runtimeConfig 取得，不在此處理
  next()
}

/**
 * 大廳頁面守衛
 *
 * @description
 * 防止使用者在不適當的情況下進入大廳。
 *
 * 規則：
 * - 若 gameState 已初始化（game_id 存在），代表遊戲會話已建立
 *   → 重定向至 /game（可能是重連或誤導航）
 * - 否則允許進入大廳
 *
 * @param to - 目標路由
 * @param from - 來源路由
 * @param next - 導航控制函數
 *
 * @example
 * ```typescript
 * // 在 router/index.ts 中使用:
 * {
 *   path: '/lobby',
 *   component: GameLobby,
 *   beforeEnter: lobbyPageGuard
 * }
 * ```
 */
export function lobbyPageGuard(
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext
): void {
  const gameState = useGameStateStore()

  // 若遊戲會話已建立，重定向至遊戲畫面
  if (gameState.gameId) {
    console.warn('[Router] 遊戲會話已存在，重定向至 /game', {
      gameId: gameState.gameId,
      from: from.path,
    })
    next({ name: 'game' })
    return
  }

  console.info('[Router] 進入大廳頁面', { from: from.path })
  next()
}
