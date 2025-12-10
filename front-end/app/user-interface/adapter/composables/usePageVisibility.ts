/**
 * usePageVisibility Composable
 *
 * @description
 * 監聽頁面可見性變化，當頁面從隱藏狀態恢復為可見時，
 * 觸發狀態恢復流程以確保遊戲狀態與後端同步。
 *
 * 設計原則：
 * - 頁面恢復可見時立即觸發（無延遲門檻）
 * - 透過 TriggerStateRecoveryPort 執行狀態恢復
 * - 符合 Clean Architecture：Adapter 呼叫 Input Port
 *
 * @example
 * ```typescript
 * import { usePageVisibility } from '~/user-interface/adapter/composables/usePageVisibility'
 *
 * // 在遊戲頁面中啟用
 * usePageVisibility()
 * ```
 */

import { onMounted, onUnmounted } from 'vue'
import { useOptionalDependency } from './useDependency'
import { TOKENS } from '../di/tokens'
import type { TriggerStateRecoveryPort } from '../../application/ports/input'
import type { SessionContextPort } from '../../application/ports/output'

/**
 * 頁面可見性監控 Composable
 *
 * @description
 * 自動監聽 document.visibilitychange 事件，
 * 當頁面從隱藏變為可見時，觸發狀態恢復。
 */
export function usePageVisibility() {
  // 使用 optional dependency 因為在某些模式下可能不存在
  const triggerStateRecovery = useOptionalDependency<TriggerStateRecoveryPort>(
    TOKENS.TriggerStateRecoveryPort
  )
  const sessionContext = useOptionalDependency<SessionContextPort>(
    TOKENS.SessionContextPort
  )

  /**
   * 處理頁面可見性變化
   */
  function handleVisibilityChange(): void {
    // 只在頁面變為可見時處理
    if (document.hidden) {
      console.info('[usePageVisibility] 頁面進入隱藏狀態')
      return
    }

    console.info('[usePageVisibility] 頁面恢復可見')

    // 檢查是否有活躍的遊戲（從 SessionContextPort 取得 gameId）
    const gameId = sessionContext?.getGameId()
    if (!gameId) {
      console.info('[usePageVisibility] 無活躍遊戲，跳過狀態恢復')
      return
    }

    // 檢查 TriggerStateRecoveryPort 是否可用
    if (!triggerStateRecovery) {
      console.warn('[usePageVisibility] TriggerStateRecoveryPort 未註冊，跳過狀態恢復')
      return
    }

    // 觸發狀態恢復流程
    console.info('[usePageVisibility] 觸發狀態恢復', { gameId })
    void triggerStateRecovery.execute(gameId)
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
