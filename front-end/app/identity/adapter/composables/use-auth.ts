/**
 * useAuth Composable
 *
 * @description
 * 提供認證操作的 Composable。
 * 封裝認證相關的邏輯與狀態。
 *
 * 參考: specs/010-player-account/plan.md - Frontend Adapter Layer
 */

import { storeToRefs } from 'pinia'
import { useAuthStore } from '../stores/auth-store'

/**
 * 認證 Composable
 *
 * @example
 * ```vue
 * <script setup>
 * const { initAuth, logout, isLoading, isInitialized } = useAuth()
 *
 * // 在 app 初始化時呼叫
 * await initAuth()
 * </script>
 * ```
 */
export function useAuth() {
  const authStore = useAuthStore()
  const { isLoading, isInitialized, isLoggedIn } = storeToRefs(authStore)

  return {
    /**
     * 初始化認證狀態
     *
     * 檢查當前 Session，若無則自動建立訪客
     */
    initAuth: authStore.initAuth,

    /**
     * 登出
     */
    logout: authStore.logout,

    /**
     * 更新當前玩家（用於登入/註冊後）
     */
    setCurrentPlayer: authStore.setCurrentPlayer,

    /**
     * 是否正在載入
     */
    isLoading,

    /**
     * 認證狀態是否已初始化
     */
    isInitialized,

    /**
     * 是否已登入
     */
    isLoggedIn,
  }
}
