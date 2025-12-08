/**
 * DI 容器初始化 Plugin
 *
 * @description
 * Nuxt 4 plugin，負責在 client-side 初始化依賴注入容器。
 * 檔名使用 `.client.ts` 後綴確保僅在 client-side 運行。
 * 檔名前綴 `01.` 確保此 plugin 優先載入（在 Pinia 之後）。
 *
 * @see /Users/leo-huang/Projects/vue/hanahuda/front-end/src/user-interface/adapter/di/registry.ts
 */

import type { Pinia } from 'pinia'
import { container } from '~/user-interface/adapter/di/container'
import { registerDependencies, type GameMode } from '~/user-interface/adapter/di/registry'

export default defineNuxtPlugin({ dependsOn: ['pinia'], setup(nuxtApp) {
  // 僅在 client-side 執行（.client.ts 後綴已確保，此檢查為額外保險）
  if (import.meta.server) {
    console.warn('[DI Plugin] Skipping on server-side')
    return
  }

  // 從 nuxtApp 取得 Pinia 實例，明確傳遞給 DI registry
  const pinia = nuxtApp.$pinia as Pinia

  // 從 sessionStorage 讀取遊戲模式（預設為 'backend'）
  // 保留 sessionStorage 機制，允許開發時手動切換到 mock 模式測試
  const gameMode: GameMode = (sessionStorage.getItem('gameMode') as GameMode) || 'backend'

  console.info('[DI Plugin] Initializing DI container', { gameMode })

  try {
    // 註冊所有依賴，明確傳遞 pinia 實例
    registerDependencies(container, gameMode, pinia)

    console.info('[DI Plugin] DI container initialized successfully', {
      registeredTokens: container.getRegisteredTokens().length,
    })
  } catch (error) {
    console.error('[DI Plugin] Failed to initialize DI container:', error)
    throw error
  }

  // 提供全域 diContainer（可選，通常組件使用 useDependency composable）
  return {
    provide: {
      diContainer: container,
    },
  }
}})
