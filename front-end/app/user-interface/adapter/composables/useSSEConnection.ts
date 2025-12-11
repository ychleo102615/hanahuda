/**
 * useSSEConnection Composable
 *
 * @description
 * 管理 SSE 連線的建立、狀態同步與斷開。
 * 封裝 GameEventClient 的連線邏輯，並與 UIStateStore 的 connectionStatus 同步。
 *
 * 功能：
 * - 建立和管理 SSE 連線
 * - 區分首次連線與重連，重連時觸發狀態恢復
 * - 與 UIStateStore 同步連線狀態
 *
 * @note session_token 由 HttpOnly Cookie 自動傳送，無需手動傳遞
 *
 * @example
 * ```typescript
 * import { useSSEConnection } from '~/user-interface/adapter/composables/useSSEConnection'
 *
 * const { connect, disconnect, isConnected } = useSSEConnection()
 *
 * // 建立連線
 * connect(gameId)
 *
 * // 離開遊戲時斷開連線
 * disconnect()
 * ```
 */

import { computed, ref } from 'vue'
import { useUIStateStore } from '../stores/uiState'
import { useOptionalDependency } from './useDependency'
import { TOKENS } from '../di/tokens'
import type { GameEventClient } from '../sse/GameEventClient'
import type { TriggerStateRecoveryPort } from '../../application/ports/input'
import type { ReconnectionPort } from '../../application/ports/output'
import type { OperationSessionManager } from '../abort'

/**
 * SSE 連線管理 Composable
 *
 * @returns 連線管理方法和狀態
 */
export function useSSEConnection() {
  const uiStore = useUIStateStore()

  // 使用 optional dependency 因為在 mock 模式下可能不存在
  const gameEventClient = useOptionalDependency<GameEventClient>(TOKENS.GameEventClient)
  const triggerStateRecovery = useOptionalDependency<TriggerStateRecoveryPort>(TOKENS.TriggerStateRecoveryPort)
  const operationSession = useOptionalDependency<OperationSessionManager>(TOKENS.OperationSessionManager)
  const reconnectionPort = useOptionalDependency<ReconnectionPort>(TOKENS.ReconnectionPort)

  // 區分首次連線與重連
  const isFirstConnection = ref(true)

  // 儲存當前 gameId 供重連使用
  let currentGameId: string | null = null

  /**
   * 當前是否已連線
   */
  const isConnected = computed(() => uiStore.connectionStatus === 'connected')

  /**
   * 當前是否正在連線中
   */
  const isConnecting = computed(() => uiStore.connectionStatus === 'connecting')

  /**
   * 建立 SSE 連線
   *
   * @param gameId - 遊戲 ID
   *
   * @note session_token 由 HttpOnly Cookie 自動傳送，無需手動傳遞
   */
  function connect(gameId: string): void {
    if (!gameEventClient) {
      console.warn('[useSSEConnection] GameEventClient 未註冊，跳過 SSE 連線（可能為 mock 模式）')
      return
    }

    console.info('[useSSEConnection] 建立 SSE 連線', { gameId })

    // 儲存 gameId 供重連使用
    currentGameId = gameId

    // 更新連線狀態為 connecting
    uiStore.setConnectionStatus('connecting')

    // 設定連線狀態回調
    gameEventClient.onConnectionEstablished(() => {
      if (isFirstConnection.value) {
        // 首次連線：正常流程
        console.info('[useSSEConnection] SSE 首次連線已建立')
        isFirstConnection.value = false
        uiStore.setConnectionStatus('connected')
      } else if (uiStore.skipNextSSERecovery) {
        // 頁面恢復後的重連：狀態已由 usePageVisibility 恢復，跳過
        console.info('[useSSEConnection] SSE 重連成功（狀態已恢復，跳過自動恢復）')
        uiStore.setSkipNextSSERecovery(false)
        uiStore.setConnectionStatus('connected')
        uiStore.hideReconnectionMessage()
      } else {
        // 網路中斷後的重連：觸發狀態恢復流程
        console.info('[useSSEConnection] SSE 重連成功，觸發狀態恢復')
        uiStore.setConnectionStatus('connected')

        // 清理：中斷進行中的操作和清空 event chain
        // 這些清理在 Use Case 執行前完成，確保舊的動畫和事件不會干擾
        if (operationSession) {
          operationSession.abortAll()
          console.info('[useSSEConnection] 已中斷所有進行中的操作')
        }
        if (reconnectionPort) {
          reconnectionPort.clearPendingEvents()
          console.info('[useSSEConnection] 已清空事件處理鏈')
        }

        // 觸發狀態恢復
        if (triggerStateRecovery && currentGameId) {
          void triggerStateRecovery.execute(currentGameId)
        } else {
          console.warn('[useSSEConnection] 無法觸發狀態恢復：缺少 TriggerStateRecoveryPort 或 gameId')
          uiStore.hideReconnectionMessage()
        }
      }
    })

    gameEventClient.onConnectionLost(() => {
      console.warn('[useSSEConnection] SSE 連線中斷')
      uiStore.setConnectionStatus('disconnected')
      uiStore.showReconnectionMessage()
    })

    gameEventClient.onConnectionFailed(() => {
      console.error('[useSSEConnection] SSE 連線失敗')
      uiStore.setConnectionStatus('disconnected')
      uiStore.showErrorMessage('無法連線到遊戲伺服器')
    })

    // 建立連線（session_token 由 Cookie 自動傳送）
    gameEventClient.connect(gameId)
  }

  /**
   * 斷開 SSE 連線
   */
  function disconnect(): void {
    if (!gameEventClient) {
      return
    }

    console.info('[useSSEConnection] 斷開 SSE 連線')
    gameEventClient.disconnect()
    uiStore.setConnectionStatus('disconnected')
  }

  /**
   * 建立 SSE 連線，但跳過自動狀態恢復
   *
   * @param gameId - 遊戲 ID
   *
   * @description
   * 用於頁面恢復可見後的重連場景。
   * 此時狀態已由 usePageVisibility 恢復，不需要再觸發 TriggerStateRecoveryUseCase。
   *
   * @example
   * ```typescript
   * // 頁面恢復可見後
   * await triggerStateRecovery.execute(gameId)
   * sseConnection.connectWithoutRecovery(gameId)
   * ```
   */
  function connectWithoutRecovery(gameId: string): void {
    console.info('[useSSEConnection] 建立 SSE 連線（跳過自動狀態恢復）', { gameId })
    uiStore.setSkipNextSSERecovery(true)
    connect(gameId)
  }

  return {
    connect,
    connectWithoutRecovery,
    disconnect,
    isConnected,
    isConnecting,
  }
}
