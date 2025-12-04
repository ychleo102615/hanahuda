/**
 * Game Page Middleware - 遊戲頁面中間件
 *
 * @description
 * 當進入遊戲頁面時，根據查詢參數決定遊戲模式：
 * - Mock 模式（預設）：開發測試模式，不需要後端
 * - Backend 模式：連接後端伺服器
 * - Local 模式：離線單機遊戲
 *
 * @example
 * ```
 * // URL 範例：
 * /game                // Mock 模式（預設）
 * /game?mode=mock      // Mock 模式
 * /game?mode=backend   // Backend 模式
 * /game?mode=local     // Local 模式
 * ```
 */

import { useGameStateStore } from '~/user-interface/adapter/stores/gameState'

export default defineNuxtRouteMiddleware((to, from) => {
  // Nuxt 4: 只在 client-side 執行
  if (import.meta.server) {
    return
  }

  const gameState = useGameStateStore()

  // 獲取遊戲模式（預設為 mock）
  const mode = (to.query.mode as string) || 'mock'

  console.info('[Middleware] 進入遊戲頁面', { mode, from: from.path })

  if (!gameState.gameId) {
    console.warn('[Middleware] 無遊戲會話，重定向至 /lobby')
    return navigateTo('/lobby')
  }

  // 根據模式初始化
  switch (mode) {
    case 'mock':
      // Mock 模式：開發測試模式
      initMockMode()
      break

    case 'backend':
      // Backend 模式：連接後端伺服器
      initBackendMode()
      break

    case 'local':
      // Local 模式：離線單機遊戲
      initLocalMode()
      break

    default:
      console.warn(`[Middleware] 未知的遊戲模式：${mode}，使用預設 mock 模式`)
      initMockMode()
  }
})

/**
 * 初始化 Mock 模式
 * @private
 */
function initMockMode(): void {
  console.info('[Middleware] 初始化 Mock 模式')

  // 在 GamePage.vue mounted 時會自動：
  // 1. 從 DI Container 解析 MockApiClient
  // 2. 調用 joinGame() 初始化遊戲
  // 3. 從 DI Container 解析 MockEventEmitter
  // 4. 調用 emitter.start() 開始發送事件

  // 註冊標記，讓 DI Container 知道使用 Mock 模式
  sessionStorage.setItem('gameMode', 'mock')
}

/**
 * 初始化 Backend 模式
 * @private
 */
function initBackendMode(): void {
  console.info('[Middleware] 初始化 Backend 模式')

  // TODO: 在 GamePage.vue mounted 時會：
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
  console.info('[Middleware] 初始化 Local 模式')

  // TODO: 在 GamePage.vue mounted 時會：
  // 1. 從 DI Container 解析 LocalGameAdapter
  // 2. 初始化離線遊戲引擎
  // 注意：Local Game BC 尚未實作，此為預留

  sessionStorage.setItem('gameMode', 'local')
}
