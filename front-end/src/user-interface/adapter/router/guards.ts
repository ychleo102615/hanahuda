/**
 * Router Guards - 路由守衛
 *
 * @description
 * 定義 Vue Router 的路由守衛,處理頁面導航邏輯。
 *
 * 守衛:
 * - gamePageGuard: 遊戲頁面守衛,處理遊戲初始化與模式切換
 */

import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router'

/**
 * 遊戲頁面守衛
 *
 * @description
 * 當進入遊戲頁面時,根據查詢參數決定遊戲模式:
 * - Mock 模式 (預設): 開發測試模式,不需要後端
 * - Backend 模式: 連接後端伺服器
 * - Local 模式: 離線單機遊戲
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
 *
 * // URL 範例:
 * /game                // Mock 模式 (預設)
 * /game?mode=mock      // Mock 模式
 * /game?mode=backend   // Backend 模式
 * /game?mode=local     // Local 模式
 * ```
 */
export function gamePageGuard(
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext
): void {
  // 獲取遊戲模式 (預設為 mock)
  const mode = (to.query.mode as string) || 'mock'

  console.info('[Router] 進入遊戲頁面', { mode, from: from.path })

  // 根據模式初始化
  switch (mode) {
    case 'mock':
      // Mock 模式: 開發測試模式
      initMockMode()
      break

    case 'backend':
      // Backend 模式: 連接後端伺服器
      initBackendMode()
      break

    case 'local':
      // Local 模式: 離線單機遊戲
      initLocalMode()
      break

    default:
      console.warn(`[Router] 未知的遊戲模式: ${mode}, 使用預設 mock 模式`)
      initMockMode()
  }

  next()
}

/**
 * 初始化 Mock 模式
 * @private
 */
function initMockMode(): void {
  console.info('[Router] 初始化 Mock 模式')

  // 在 GamePage.vue mounted 時會自動:
  // 1. 從 DI Container 解析 MockApiClient
  // 2. 調用 joinGame() 初始化遊戲
  // 3. 從 DI Container 解析 MockEventEmitter
  // 4. 調用 emitter.start() 開始發送事件

  // 註冊標記,讓 DI Container 知道使用 Mock 模式
  sessionStorage.setItem('gameMode', 'mock')
}

/**
 * 初始化 Backend 模式
 * @private
 */
function initBackendMode(): void {
  console.info('[Router] 初始化 Backend 模式')

  // TODO: 在 GamePage.vue mounted 時會:
  // 1. 從 DI Container 解析 GameApiClient
  // 2. 調用 joinGame() 連接後端
  // 3. 從 DI Container 解析 GameEventClient
  // 4. 調用 connect() 建立 SSE 連線

  sessionStorage.setItem('gameMode', 'backend')
}

/**
 * 初始化 Local 模式
 * @private
 */
function initLocalMode(): void {
  console.info('[Router] 初始化 Local 模式')

  // TODO: 在 GamePage.vue mounted 時會:
  // 1. 從 DI Container 解析 LocalGameAdapter
  // 2. 初始化離線遊戲引擎
  // 注意: Local Game BC 尚未實作,此為預留

  sessionStorage.setItem('gameMode', 'local')
}
