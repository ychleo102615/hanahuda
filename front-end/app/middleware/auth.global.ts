/**
 * Auth Middleware
 *
 * @description
 * 認證中介層，確保進入頁面前已初始化認證狀態。
 * 若無有效 Session，自動建立訪客身份。
 *
 * 參考: specs/010-player-account/plan.md - Frontend Middleware
 */

import { useAuthStore } from '~/identity/adapter/stores/auth-store'

export default defineNuxtRouteMiddleware(async () => {
  // 只在 client 端執行
  if (import.meta.server) {
    return
  }

  const authStore = useAuthStore()

  // 若尚未初始化，執行初始化
  if (!authStore.isInitialized) {
    await authStore.initAuth()
  }
})
