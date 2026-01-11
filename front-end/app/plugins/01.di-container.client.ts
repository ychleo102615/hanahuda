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
    return
  }

  // 從 nuxtApp 取得 Pinia 實例，明確傳遞給 DI registry
  const pinia = nuxtApp.$pinia as Pinia

  // 從 Nuxt runtimeConfig 讀取遊戲模式（單一真相來源）
  // 模式由 .env 中的 NUXT_PUBLIC_GAME_MODE 決定，預設為 'backend'
  const config = useRuntimeConfig()
  const gameMode = config.public.gameMode as GameMode


  try {
    // 註冊所有依賴，明確傳遞 pinia 實例
    registerDependencies(container, gameMode, pinia)

  } catch (error) {
    throw error
  }

  // 提供全域 diContainer（可選，通常組件使用 resolveDependency）
  return {
    provide: {
      diContainer: container,
    },
  }
}})
