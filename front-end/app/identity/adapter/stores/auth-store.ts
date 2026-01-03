/**
 * Auth Store (Pinia)
 *
 * @description
 * 管理認證狀態的 Pinia Store。
 *
 * 參考: specs/010-player-account/plan.md - Frontend Adapter Layer
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { CurrentPlayer } from '../../domain/current-player'
import { ANONYMOUS_PLAYER, isAuthenticated, isGuestPlayer, isRegisteredPlayer } from '../../domain/current-player'
import { CheckAuthStatusUseCase } from '../../application/use-cases/check-auth-status-use-case'
import { useAuthApiClient } from '../api/auth-api-client'

export const useAuthStore = defineStore('auth', () => {
  // ==========================================================================
  // State
  // ==========================================================================

  const currentPlayer = ref<CurrentPlayer>(ANONYMOUS_PLAYER)
  const isLoading = ref(false)
  const isInitialized = ref(false)

  // ==========================================================================
  // Getters
  // ==========================================================================

  const isLoggedIn = computed(() => isAuthenticated(currentPlayer.value))
  const isGuest = computed(() => isGuestPlayer(currentPlayer.value))
  const isRegistered = computed(() => isRegisteredPlayer(currentPlayer.value))
  const playerId = computed(() => currentPlayer.value.id)
  const displayName = computed(() => currentPlayer.value.displayName)

  // ==========================================================================
  // Actions
  // ==========================================================================

  /**
   * 初始化認證狀態
   *
   * 檢查當前 Session，若無則自動建立訪客
   */
  async function initAuth(): Promise<void> {
    if (isInitialized.value) {
      return
    }

    isLoading.value = true

    try {
      const authApi = useAuthApiClient()
      const useCase = new CheckAuthStatusUseCase(authApi)
      currentPlayer.value = await useCase.execute()
    } finally {
      isLoading.value = false
      isInitialized.value = true
    }
  }

  /**
   * 登出
   */
  async function logout(): Promise<void> {
    isLoading.value = true

    try {
      const authApi = useAuthApiClient()
      await authApi.logout()
      currentPlayer.value = ANONYMOUS_PLAYER
      isInitialized.value = false
    } catch (error) {
      console.error('Failed to logout:', error)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 更新當前玩家資訊
   *
   * 用於註冊或登入後更新狀態
   */
  function setCurrentPlayer(player: CurrentPlayer): void {
    currentPlayer.value = player
    isInitialized.value = true
  }

  /**
   * 重置狀態（用於測試）
   */
  function $reset(): void {
    currentPlayer.value = ANONYMOUS_PLAYER
    isLoading.value = false
    isInitialized.value = false
  }

  return {
    // State
    currentPlayer,
    isLoading,
    isInitialized,

    // Getters
    isLoggedIn,
    isGuest,
    isRegistered,
    playerId,
    displayName,

    // Actions
    initAuth,
    logout,
    setCurrentPlayer,
    $reset,
  }
})
