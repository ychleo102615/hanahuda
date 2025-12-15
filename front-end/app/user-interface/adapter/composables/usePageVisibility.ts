/**
 * usePageVisibility Composable
 *
 * @description
 * 監聽頁面可見性變化，當頁面從隱藏狀態恢復為可見時，
 * 觸發遊戲重連流程以確保遊戲狀態與後端同步。
 *
 * 重連流程（SSE-First Architecture）：
 * 1. 頁面恢復可見時，檢查是否有活躍遊戲
 * 2. 調用 StartGameUseCase 重新建立 SSE 連線
 * 3. 後端推送 InitialState（response_type: 'reconnect'）
 * 4. HandleInitialStateUseCase 分派到 handleSnapshotRestore()
 * 5. HandleStateRecoveryUseCase 執行狀態恢復（包含 abortAll）
 *
 * 設計原則：
 * - Adapter 層 composable，負責監聽 DOM 事件
 * - 透過 StartGameUseCase 觸發重連，不直接操作連線
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
import { useDependency, useOptionalDependency } from './useDependency'
import { useGameMode } from './useGameMode'
import { TOKENS } from '../di/tokens'
import type { StartGamePort } from '../../application/ports/input'
import type { SessionContextPort } from '../../application/ports/output'

/**
 * 頁面可見性監控 Composable
 *
 * @description
 * 自動監聯 document.visibilitychange 事件，
 * 當頁面從隱藏變為可見時，觸發遊戲重連流程。
 */
export function usePageVisibility(): void {
  const gameMode = useGameMode()

  // 僅在 backend 模式下有效
  if (gameMode !== 'backend') {
    return
  }

  const startGameUseCase = useOptionalDependency<StartGamePort>(TOKENS.StartGamePort)
  const sessionContext = useDependency<SessionContextPort>(TOKENS.SessionContextPort)

  /**
   * 處理頁面可見性變化
   */
  function handleVisibilityChange(): void {
    // 頁面隱藏時不處理
    if (document.hidden) {
      return
    }

    // 頁面恢復可見
    console.info('[usePageVisibility] 頁面恢復可見')

    // 檢查是否有活躍遊戲（gameId 由 SessionContextPort 管理）
    const gameId = sessionContext.getGameId()
    if (!gameId) {
      console.info('[usePageVisibility] 無活躍遊戲，跳過重連')
      return
    }

    // 檢查 StartGameUseCase 是否可用
    if (!startGameUseCase) {
      console.warn('[usePageVisibility] StartGameUseCase 未註冊，跳過重連')
      return
    }

    // 觸發重連（不帶 isNewGame，保留 gameId）
    console.info('[usePageVisibility] 觸發遊戲重連', { gameId })
    startGameUseCase.execute()
  }

  onMounted(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange)
    console.info('[usePageVisibility] 已啟用頁面可見性監控')
  })

  onUnmounted(() => {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    console.info('[usePageVisibility] 已停用頁面可見性監控')
  })
}
