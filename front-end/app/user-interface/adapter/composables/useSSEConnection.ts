/**
 * useSSEConnection Composable
 *
 * @description
 * 管理 SSE 連線的建立、狀態同步與斷開。
 * 封裝 GameEventClient 的連線邏輯，並與 UIStateStore 的 connectionStatus 同步。
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

import { computed } from 'vue'
import { useUIStateStore } from '../stores/uiState'
import { useOptionalDependency } from './useDependency'
import { TOKENS } from '../di/tokens'
import type { GameEventClient } from '../sse/GameEventClient'

/**
 * SSE 連線管理 Composable
 *
 * @returns 連線管理方法和狀態
 */
export function useSSEConnection() {
  const uiStore = useUIStateStore()

  // 使用 optional dependency 因為在 mock 模式下可能不存在
  const gameEventClient = useOptionalDependency<GameEventClient>(TOKENS.GameEventClient)

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

    // 更新連線狀態為 connecting
    uiStore.setConnectionStatus('connecting')

    // 設定連線狀態回調
    gameEventClient.onConnectionEstablished(() => {
      console.info('[useSSEConnection] SSE 連線已建立')
      uiStore.setConnectionStatus('connected')
      uiStore.hideReconnectionMessage()
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

  return {
    connect,
    disconnect,
    isConnected,
    isConnecting,
  }
}
