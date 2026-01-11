/**
 * usePageVisibility Composable
 *
 * @description
 * 監聽頁面可見性變化，當頁面從隱藏狀態恢復為可見時，
 * 檢查 Gateway SSE 連線狀態並在必要時重新連線。
 *
 * Gateway Architecture 重連流程：
 * 1. 頁面恢復可見時，檢查 Gateway SSE 連線狀態
 * 2. 如果連線已斷開，重新建立連線
 * 3. 後端推送 GatewayConnected 事件（包含玩家狀態）
 * 4. HandleGatewayConnectedUseCase 根據狀態恢復 UI
 *
 * 設計原則：
 * - Adapter 層 composable，負責監聽 DOM 事件
 * - 使用 singleton GatewayEventClient 確保單一連線
 * - 僅在 backend 模式下有效
 *
 * @example
 * ```typescript
 * // 在遊戲頁面中使用
 * usePageVisibility()
 * ```
 *
 * @module user-interface/adapter/composables/usePageVisibility
 */

import { onMounted, onUnmounted } from 'vue'
import { useDependency } from './useDependency'
import { useGameMode } from './useGameMode'
import { TOKENS } from '../di/tokens'
import type { GatewayEventClient } from '../sse/GatewayEventClient'
import { useAuthStore } from '~/identity/adapter/stores/auth-store'

/** 防抖間隔（毫秒）- iOS 上 visibilitychange 可能短時間內觸發多次 */
const RECONNECT_DEBOUNCE_MS = 2000

/**
 * 頁面可見性監控 Composable
 *
 * @description
 * 自動監聯 document.visibilitychange 事件，
 * 當頁面從隱藏變為可見時，檢查 Gateway 連線並在必要時重連。
 */
export function usePageVisibility(): void {
  const gameMode = useGameMode()

  // 僅在 backend 模式下有效
  if (gameMode !== 'backend') {
    return
  }

  const gatewayClient = useDependency<GatewayEventClient>(TOKENS.GatewayEventClient)
  const authStore = useAuthStore()

  // 防抖：記錄上次觸發時間，避免 iOS 上多次觸發
  let lastTriggerTime = 0

  /**
   * 處理頁面可見性變化
   */
  function handleVisibilityChange(): void {
    // 頁面隱藏時不處理
    if (document.hidden) {
      return
    }

    // 頁面恢復可見

    // 防抖檢查：2 秒內不重複觸發
    const now = Date.now()
    if (now - lastTriggerTime < RECONNECT_DEBOUNCE_MS) {
      return
    }
    lastTriggerTime = now

    // 檢查是否已登入
    if (!authStore.isLoggedIn) {
      return
    }

    // 檢查 Gateway 連線狀態
    // 如果連線已斷開，重新建立連線
    if (!gatewayClient.isConnected()) {
      gatewayClient.connect()
    }
  }

  onMounted(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange)
  })

  onUnmounted(() => {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  })
}
