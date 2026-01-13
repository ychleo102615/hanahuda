/**
 * Auth Middleware
 *
 * @description
 * 認證中介層，確保進入頁面前已初始化認證狀態。
 * 若無有效 Session，自動建立訪客身份。
 *
 * 支援 Telegram Mini App 自動驗證：
 * 若在 Telegram 環境內且尚未驗證，會先執行 Telegram 認證，
 * 成功後再執行標準認證初始化（從 Session Cookie 讀取狀態）。
 *
 * 參考: specs/010-player-account/plan.md - Frontend Middleware
 */

import { useAuthStore } from '~/identity/adapter/stores/auth-store'
import { useTelegram } from '~/composables/useTelegram'

export default defineNuxtRouteMiddleware(async () => {
  // 只在 client 端執行
  if (import.meta.server) {
    return
  }

  const authStore = useAuthStore()
  const telegram = useTelegram()

  console.log('[Auth Middleware] Starting...')
  console.log('[Auth Middleware] authStore.isInitialized:', authStore.isInitialized)
  console.log('[Auth Middleware] telegram.isTelegramEnv:', telegram.isTelegramEnv.value)
  console.log('[Auth Middleware] telegram.isVerified:', telegram.isVerified.value)

  // 若尚未初始化
  if (!authStore.isInitialized) {
    // 如果在 Telegram 環境內且尚未驗證，先執行 Telegram 認證
    if (telegram.isTelegramEnv.value && !telegram.isVerified.value) {
      console.log('[Auth Middleware] 🔐 Attempting Telegram verification...')
      const verified = await telegram.verify()

      if (verified) {
        console.log('[Auth Middleware] ✅ Telegram verification successful!')
      } else {
        // Telegram 驗證失敗，記錄錯誤但繼續執行標準認證
        // 這允許用戶以訪客身份進入（或顯示錯誤頁面）
        console.warn('[Auth Middleware] ❌ Telegram verification failed:', telegram.error.value)
      }
    } else {
      console.log('[Auth Middleware] Skipping Telegram verification (not in Telegram or already verified)')
    }

    // 執行標準認證初始化
    // 如果 Telegram 驗證成功，Session Cookie 已設定，會讀取到已登入狀態
    // 如果失敗或不在 Telegram 環境，會建立訪客身份
    console.log('[Auth Middleware] 🔄 Calling authStore.initAuth()...')
    await authStore.initAuth()
    console.log('[Auth Middleware] ✅ Auth initialization complete')
  }
})
