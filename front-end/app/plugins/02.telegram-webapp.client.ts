/**
 * Telegram WebApp Plugin
 *
 * @description
 * Nuxt Plugin 用於初始化 Telegram Mini App 環境。
 * 此 Plugin 在 DI Container Plugin 之前執行（由檔名 02 確保順序）。
 *
 * 功能：
 * 1. 檢測是否在 Telegram Mini App 環境內
 * 2. 初始化 Telegram WebApp SDK（呼叫 ready() 和 expand()）
 * 3. 設定主題顏色
 * 4. 提供 $telegramEnv 給應用程式
 *
 * @example
 * ```typescript
 * // 在元件中使用
 * const { $telegramEnv } = useNuxtApp()
 *
 * if ($telegramEnv.isInTelegram) {
 *   console.log('Running in Telegram Mini App')
 *   console.log('initData:', $telegramEnv.initData)
 * }
 * ```
 */

import { getTelegramSdkClient, type TelegramEnvironment } from '~/game-client/adapter/telegram/TelegramSdkClient'

export default defineNuxtPlugin(() => {
  // Debug: 檢查 window.Telegram 是否存在
  console.log('[Telegram Plugin] Starting initialization...')
  console.log('[Telegram Plugin] window.Telegram exists:', typeof window !== 'undefined' && !!window.Telegram)
  console.log('[Telegram Plugin] window.Telegram.WebApp exists:', typeof window !== 'undefined' && !!window.Telegram?.WebApp)
  console.log('[Telegram Plugin] initData:', typeof window !== 'undefined' && window.Telegram?.WebApp?.initData?.substring(0, 50) + '...')

  // 取得 SDK Client 單例
  const sdkClient = getTelegramSdkClient()

  // 初始化並取得環境資訊
  const environment = sdkClient.initialize()

  console.log('[Telegram Plugin] Environment detected:', environment)

  // 如果在 Telegram 環境內，設定主題色
  if (environment.isInTelegram) {
    // 設定 Header 和背景顏色（配合遊戲主題）
    sdkClient.setHeaderColor('#1f2937') // gray-800
    sdkClient.setBackgroundColor('#111827') // gray-900

    // 啟用關閉確認（遊戲進行中時防止誤關）
    // 注意：可在遊戲結束後停用
    // sdkClient.enableClosingConfirmation()

    console.log('[Telegram Plugin] ✅ Initialized in Telegram Mini App environment')
    console.log('[Telegram Plugin] Platform:', environment.platform)
    console.log('[Telegram Plugin] Version:', environment.version)
    console.log('[Telegram Plugin] Color Scheme:', environment.colorScheme)
    console.log('[Telegram Plugin] initData length:', environment.initData?.length)
  } else {
    console.log('[Telegram Plugin] ❌ Not in Telegram environment, skipping initialization')
  }

  return {
    provide: {
      telegramEnv: environment,
      telegramSdk: sdkClient,
    },
  }
})

// =============================================================================
// Type Augmentation
// =============================================================================

declare module '#app' {
  interface NuxtApp {
    $telegramEnv: TelegramEnvironment
    $telegramSdk: ReturnType<typeof getTelegramSdkClient>
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $telegramEnv: TelegramEnvironment
    $telegramSdk: ReturnType<typeof getTelegramSdkClient>
  }
}
