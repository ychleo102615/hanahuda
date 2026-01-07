/**
 * useMatchmakingConnection - 配對 SSE 連線管理 Composable
 *
 * @description
 * 僅負責 Vue 響應式狀態管理，委託 MatchmakingEventClient 處理 SSE 連線。
 * 符合 Clean Architecture：Composable 只管理 Presentation 層狀態。
 *
 * 控制流：
 * - MatchmakingEventClient → MatchmakingEventRouter → Use Cases → Output Ports
 * - 此 Composable 只監聽連線狀態回調
 *
 * @module app/user-interface/adapter/composables/useMatchmakingConnection
 */

import { ref, onUnmounted } from 'vue'
import { useDependency } from './useDependency'
import { TOKENS } from '../di/tokens'
import type { SessionContextPort, MatchmakingStatePort } from '../../application/ports/output'
import type { MatchmakingEventClient } from '../sse/MatchmakingEventClient'
import type { MatchmakingApiClient } from '../api/MatchmakingApiClient'

/**
 * 配對連線狀態
 */
export interface MatchmakingConnectionState {
  /** 是否已連線 */
  isConnected: boolean
  /** 連線錯誤訊息 */
  errorMessage: string | null
}

/**
 * 配對連線 Composable
 *
 * @description
 * 使用 DI 注入的 MatchmakingEventClient 進行 SSE 連線管理。
 * 事件處理由 MatchmakingEventRouter 路由到對應的 Use Cases。
 *
 * 職責：
 * - 啟動/關閉 SSE 連線
 * - 管理 Vue 響應式連線狀態
 * - 提供取消配對功能
 */
export function useMatchmakingConnection() {
  // DI - 取得已組裝好的元件
  const eventClient = useDependency<MatchmakingEventClient>(TOKENS.MatchmakingEventClient)
  const sessionContext = useDependency<SessionContextPort>(TOKENS.SessionContextPort)
  const matchmakingState = useDependency<MatchmakingStatePort>(TOKENS.MatchmakingStatePort)
  const matchmakingApiClient = useDependency<MatchmakingApiClient>(TOKENS.MatchmakingApiClient)

  // Vue 響應式狀態
  const state = ref<MatchmakingConnectionState>({
    isConnected: false,
    errorMessage: null,
  })

  // 設定連線狀態回調
  eventClient.onConnectionEstablished(() => {
    state.value.isConnected = true
    state.value.errorMessage = null
  })

  eventClient.onConnectionLost(() => {
    state.value.isConnected = false
    state.value.errorMessage = 'Connection lost'
    matchmakingState.setStatus('error')
    matchmakingState.setErrorMessage('Connection lost')
  })

  eventClient.onConnectionFailed(() => {
    state.value.isConnected = false
    state.value.errorMessage = 'Connection failed'
    matchmakingState.setStatus('error')
    matchmakingState.setErrorMessage('Failed to connect')
  })

  /**
   * 建立配對 SSE 連線
   */
  function connect(): void {
    const entryId = sessionContext.getEntryId()
    if (!entryId) {
      state.value.errorMessage = 'No matchmaking entry ID'
      return
    }

    // 設定初始狀態
    matchmakingState.setStatus('searching')
    matchmakingState.setEntryId(entryId)

    // 委託 EventClient 建立 SSE 連線
    eventClient.connect(entryId)
  }

  /**
   * 關閉連線
   */
  function disconnect(): void {
    eventClient.disconnect()
    state.value.isConnected = false
  }

  /**
   * 取消配對
   */
  async function cancelMatchmaking(): Promise<void> {
    const entryId = sessionContext.getEntryId()
    if (!entryId) return

    try {
      await matchmakingApiClient.cancelMatchmaking(entryId)
    } finally {
      disconnect()
      sessionContext.clearMatchmaking()
      matchmakingState.clearSession()
    }
  }

  // 清理
  onUnmounted(() => {
    disconnect()
  })

  return {
    state,
    connect,
    disconnect,
    cancelMatchmaking,
  }
}
