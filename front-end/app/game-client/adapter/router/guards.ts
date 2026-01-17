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
import { SessionContextAdapter } from '../session/SessionContextAdapter'

// 建立一個 SessionContext 實例用於路由守衛
// 注意：這是為了測試用途，實際應由 DI 注入
const sessionContext = new SessionContextAdapter()

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

  // 檢查是否有選擇的房間（配對中或準備配對）或有活躍遊戲
  // 注意：此檔案主要用於測試，實際應使用 Nuxt middleware
  if (!sessionContext.hasSelectedRoom() && !sessionContext.hasActiveGame()) {
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
 * - 若 SessionContext 有活躍的會話，代表遊戲會話已建立
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
  // 若有選擇的房間或活躍遊戲，重定向至遊戲畫面
  // 注意：此檔案主要用於測試，實際應使用 gameState.currentGameId 判斷
  if (sessionContext.hasSelectedRoom() || sessionContext.hasActiveGame()) {
    next({ name: 'game' })
    return
  }

  next()
}
