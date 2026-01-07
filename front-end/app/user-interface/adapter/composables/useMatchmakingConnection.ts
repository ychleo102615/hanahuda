/**
 * useMatchmakingConnection - 配對 SSE 連線管理
 *
 * @description
 * 管理配對狀態 SSE 連線，處理配對事件。
 *
 * 事件處理：
 * - MatchmakingStatus: 更新配對狀態（searching → low_availability）
 * - MatchFound: 配對成功，準備轉換到遊戲 SSE
 * - Error: 配對錯誤
 *
 * @module app/user-interface/adapter/composables/useMatchmakingConnection
 */

import { ref, onUnmounted } from 'vue'
import { useDependency } from './useDependency'
import { TOKENS } from '../di/tokens'
import type { SessionContextPort, MatchmakingStatePort } from '../../application/ports/output'
import { MatchmakingApiClient } from '../api/MatchmakingApiClient'
import { HandleMatchmakingStatusUseCase, type MatchmakingStatusEvent } from '../../application/use-cases/matchmaking/HandleMatchmakingStatusUseCase'
import { HandleMatchFoundUseCase, type MatchFoundEvent } from '../../application/use-cases/matchmaking/HandleMatchFoundUseCase'

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
 */
export function useMatchmakingConnection() {
  // DI
  const sessionContext = useDependency<SessionContextPort>(TOKENS.SessionContextPort)
  const matchmakingState = useDependency<MatchmakingStatePort>(TOKENS.MatchmakingStatePort)
  const matchmakingApiClient = useDependency<MatchmakingApiClient>(TOKENS.MatchmakingApiClient)

  // Use Cases
  const handleMatchmakingStatus = new HandleMatchmakingStatusUseCase(matchmakingState)
  const handleMatchFound = new HandleMatchFoundUseCase(matchmakingState, useDependency(TOKENS.NavigationPort))

  // 連線狀態
  const state = ref<MatchmakingConnectionState>({
    isConnected: false,
    errorMessage: null,
  })

  // EventSource 實例
  let eventSource: EventSource | null = null

  /**
   * 建立配對 SSE 連線
   */
  function connect(): void {
    const entryId = sessionContext.getEntryId()
    if (!entryId) {
      state.value.errorMessage = 'No matchmaking entry ID'
      return
    }

    // 關閉現有連線
    disconnect()

    // 設定初始狀態
    matchmakingState.setStatus('searching')
    matchmakingState.setEntryId(entryId)

    // 建立 SSE 連線
    eventSource = matchmakingApiClient.createStatusConnection(entryId)

    eventSource.onopen = () => {
      state.value.isConnected = true
      state.value.errorMessage = null
    }

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        handleEvent(data)
      } catch {
        console.error('[MatchmakingConnection] Failed to parse event:', event.data)
      }
    }

    eventSource.onerror = () => {
      state.value.isConnected = false
      state.value.errorMessage = 'Connection error'
      matchmakingState.setStatus('error')
      matchmakingState.setErrorMessage('Connection lost')
    }
  }

  /**
   * 處理 SSE 事件
   */
  function handleEvent(data: { event_type: string } & Record<string, unknown>): void {
    switch (data.event_type) {
      case 'MatchmakingStatus':
        handleMatchmakingStatus.execute(data as unknown as MatchmakingStatusEvent)
        break

      case 'MatchFound':
        handleMatchFound.execute(data as unknown as MatchFoundEvent)
        // 配對成功後關閉 SSE 連線
        disconnect()
        break

      case 'Error':
        matchmakingState.setStatus('error')
        matchmakingState.setErrorMessage((data as { message?: string }).message || 'Matchmaking error')
        disconnect()
        break

      default:
        console.warn('[MatchmakingConnection] Unknown event type:', data.event_type)
    }
  }

  /**
   * 關閉連線
   */
  function disconnect(): void {
    if (eventSource) {
      eventSource.close()
      eventSource = null
    }
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
    } catch {
      console.error('[MatchmakingConnection] Failed to cancel matchmaking')
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
