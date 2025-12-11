/**
 * usePageVisibility Composable
 *
 * @description
 * 監聽頁面可見性變化，當頁面從隱藏狀態恢復為可見時，
 * 執行完整的狀態恢復流程以確保遊戲狀態與後端同步。
 *
 * 狀態恢復流程：
 * 1. 頁面隱藏時：斷開 SSE 連線（避免事件堆積）
 * 2. 頁面恢復可見時：
 *    - 確保 SSE 已斷開
 *    - 取消所有 pending delays（中斷正在執行的 Use Cases）
 *    - 清空事件處理鏈（丟棄已排隊的事件）
 *    - 獲取遊戲快照並恢復狀態
 *    - 重新建立 SSE 連線（跳過自動狀態恢復）
 *
 * 設計原則：
 * - 由 Adapter 層控制 SSE 連線管理
 * - TriggerStateRecoveryUseCase 只負責業務邏輯（獲取快照、恢復狀態）
 * - 符合 Clean Architecture：Adapter 層協調技術細節
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
import { useUIStateStore } from '../stores/uiState'
import { TOKENS } from '../di/tokens'
import type { TriggerStateRecoveryPort } from '../../application/ports/input'
import type { SessionContextPort, ReconnectionPort } from '../../application/ports/output'
import type { GameEventClient } from '../sse/GameEventClient'
import type { OperationSessionManager } from '../abort'

/**
 * 頁面可見性監控 Composable
 *
 * @description
 * 自動監聽 document.visibilitychange 事件，
 * 當頁面從隱藏變為可見時，執行完整的狀態恢復流程。
 */
export function usePageVisibility() {
  const uiStore = useUIStateStore()

  // 使用 optional dependency 因為在某些模式下可能不存在
  const triggerStateRecovery = useOptionalDependency<TriggerStateRecoveryPort>(
    TOKENS.TriggerStateRecoveryPort
  )
  const sessionContext = useOptionalDependency<SessionContextPort>(
    TOKENS.SessionContextPort
  )
  const gameEventClient = useOptionalDependency<GameEventClient>(
    TOKENS.GameEventClient
  )
  const operationSession = useOptionalDependency<OperationSessionManager>(
    TOKENS.OperationSessionManager
  )
  const reconnectionPort = useOptionalDependency<ReconnectionPort>(
    TOKENS.ReconnectionPort
  )

  /**
   * 處理頁面可見性變化
   */
  function handleVisibilityChange(): void {
    const gameId = sessionContext?.getGameId()

    if (document.hidden) {
      // 頁面進入隱藏狀態：斷開 SSE 連線以避免事件堆積
      console.info('[usePageVisibility] 頁面進入隱藏狀態')

      if (gameId && gameEventClient) {
        console.info('[usePageVisibility] 斷開 SSE 連線以避免事件堆積')
        gameEventClient.disconnect()
      }
      return
    }

    // 頁面恢復可見
    console.info('[usePageVisibility] 頁面恢復可見')

    // 檢查是否有活躍的遊戲
    if (!gameId) {
      console.info('[usePageVisibility] 無活躍遊戲，跳過狀態恢復')
      return
    }

    // 檢查必要的依賴是否可用
    if (!triggerStateRecovery) {
      console.warn('[usePageVisibility] TriggerStateRecoveryPort 未註冊，跳過狀態恢復')
      return
    }

    // 執行完整的狀態恢復流程
    void executeRecoveryFlow(gameId)
  }

  /**
   * 執行完整的狀態恢復流程
   *
   * @param gameId - 遊戲 ID
   */
  async function executeRecoveryFlow(gameId: string): Promise<void> {
    console.info('[usePageVisibility] 開始執行狀態恢復流程', { gameId })

    // 1. 確保 SSE 已斷開（防止任何新事件進來）
    if (gameEventClient) {
      gameEventClient.disconnect()
      console.info('[usePageVisibility] SSE 已斷開')
    }

    // 2. 中斷所有進行中的操作（透過 AbortController 取消 Use Cases）
    if (operationSession) {
      operationSession.abortAll()
      console.info('[usePageVisibility] 已中斷所有進行中的操作')
    }

    // 3. 清空事件處理鏈（丟棄已排隊的事件）
    if (reconnectionPort) {
      reconnectionPort.clearPendingEvents()
      console.info('[usePageVisibility] 已清空事件處理鏈')
    }

    // 4. 執行狀態恢復（獲取快照、恢復狀態）
    try {
      await triggerStateRecovery!.execute(gameId)
      console.info('[usePageVisibility] 狀態恢復完成')
    } catch (error) {
      console.error('[usePageVisibility] 狀態恢復失敗', error)
      // 即使失敗也要嘗試重連 SSE
    }

    // 5. 重新建立 SSE 連線（跳過自動狀態恢復）
    if (gameEventClient) {
      uiStore.setSkipNextSSERecovery(true)
      gameEventClient.connect(gameId)
      console.info('[usePageVisibility] SSE 已重新連線（跳過自動狀態恢復）')
    }

    console.info('[usePageVisibility] 狀態恢復流程完成')
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
