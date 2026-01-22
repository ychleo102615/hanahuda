/**
 * usePageVisibility Composable
 *
 * @description
 * 監聽頁面可見性變化，當頁面從隱藏狀態恢復為可見時，
 * 強制重新建立 Gateway WebSocket 連線。
 *
 * Gateway Architecture 重連流程：
 * 1. 頁面恢復可見時，強制斷開現有連線並重新連線
 * 2. 後端推送 GatewayConnected 事件（包含玩家狀態）
 * 3. HandleGatewayConnectedUseCase 根據狀態恢復 UI
 *
 * 設計原則：
 * - Adapter 層 composable，負責監聯 DOM 事件
 * - 使用 singleton GatewayWebSocketClient 確保單一連線
 * - 僅在 backend 模式下有效
 *
 * @example
 * ```typescript
 * // 在遊戲頁面中使用
 * usePageVisibility()
 * ```
 *
 * @module game-client/adapter/composables/usePageVisibility
 */

import { onMounted, onUnmounted } from 'vue'
import { resolveDependency } from '../di/resolver'
import { useGameMode } from './useGameMode'
import { TOKENS } from '../di/tokens'
import type { GatewayWebSocketClient } from '../ws/GatewayWebSocketClient'
import type { AnimationPort } from '../../application/ports/output'
import { createCurrentPlayerContextAdapter } from '~/shared/adapters'

/** 防抖間隔（毫秒）- iOS 上 visibilitychange 可能短時間內觸發多次 */
const RECONNECT_DEBOUNCE_MS = 2000

/**
 * 頁面可見性監控 Composable
 *
 * @description
 * 自動監聯 document.visibilitychange 事件，
 * 當頁面從隱藏變為可見時，強制重新建立 Gateway 連線。
 */
export function usePageVisibility(): void {
  const gameMode = useGameMode()

  // 僅在 backend 模式下有效
  if (gameMode !== 'backend') {
    return
  }

  const gatewayClient = resolveDependency<GatewayWebSocketClient>(TOKENS.GatewayWebSocketClient)
  const animationPort = resolveDependency<AnimationPort>(TOKENS.AnimationPort)
  const playerContext = createCurrentPlayerContextAdapter()

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
    const now = Date.now()
    const timeSinceLastTrigger = now - lastTriggerTime
    const { isLoggedIn } = playerContext.getContext()

    // 防抖檢查：2 秒內不重複觸發
    if (timeSinceLastTrigger < RECONNECT_DEBOUNCE_MS) {
      return
    }
    lastTriggerTime = now

    // 檢查是否已登入
    if (!isLoggedIn) {
      return
    }

    // 中斷進行中的動畫，重置動畫狀態
    // 避免重連後 isAnimating() 仍為 true 導致無法操作
    animationPort.interrupt()

    // 強制重新連線（無論當前連線狀態）
    // 確保與後端狀態同步
    gatewayClient.forceReconnect()
  }

  onMounted(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange)
  })

  onUnmounted(() => {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  })
}
