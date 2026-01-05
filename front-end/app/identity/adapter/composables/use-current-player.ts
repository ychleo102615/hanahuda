/**
 * useCurrentPlayer Composable
 *
 * @description
 * 提供當前玩家資訊的 Composable。
 * 方便元件存取玩家狀態。
 *
 * 參考: specs/010-player-account/plan.md - Frontend Adapter Layer
 */

import { computed } from 'vue'
import { useAuthStore } from '../stores/auth-store'
import { storeToRefs } from 'pinia'

/**
 * 當前玩家 Composable
 *
 * @example
 * ```vue
 * <script setup>
 * const { playerId, displayName, isGuest } = useCurrentPlayer()
 * </script>
 *
 * <template>
 *   <div>Welcome, {{ displayName }}</div>
 * </template>
 * ```
 */
export function useCurrentPlayer() {
  const authStore = useAuthStore()
  const { currentPlayer, playerId, displayName, isGuest, isRegistered, isLoggedIn } = storeToRefs(authStore)

  return {
    /**
     * 完整的當前玩家物件
     */
    currentPlayer,

    /**
     * 玩家 ID
     */
    playerId,

    /**
     * 顯示名稱
     */
    displayName,

    /**
     * 是否為訪客
     */
    isGuest,

    /**
     * 是否為已註冊玩家
     */
    isRegistered,

    /**
     * 是否已登入（包含訪客與註冊玩家）
     */
    isLoggedIn,

    /**
     * 是否需要顯示註冊提示
     *
     * 訪客玩家且已登入時顯示
     */
    shouldShowRegisterPrompt: computed(() => isGuest.value && isLoggedIn.value),
  }
}
