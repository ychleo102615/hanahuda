/**
 * useGatewayConnection - Gateway SSE 連線管理 Composable
 *
 * @description
 * 統一的 Gateway SSE 連線管理。使用單一 SSE 連線接收所有遊戲相關事件。
 * 取代原本分散的 MatchmakingEventClient 和 GameEventClient。
 *
 * Gateway Architecture:
 * - 單一 SSE 端點：/api/v1/events
 * - 身份驗證：透過 session_id Cookie
 * - 事件格式：${domain}:${type}
 * - 初始事件：GatewayConnected（包含玩家狀態）
 *
 * 控制流：
 * - GatewayEventClient → GatewayEventRouter → Domain Routers → Use Cases
 *
 * @module app/game-client/adapter/composables/useGatewayConnection
 */

import { ref, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { resolveDependency } from '../di/resolver'
import { TOKENS } from '../di/tokens'
import type { GatewayEventClient } from '../sse/GatewayEventClient'
import type { useUIStateStore } from '../stores/uiState'
import type { SessionContextPort } from '../../application/ports/output'

/**
 * Gateway 連線狀態
 */
export type GatewayConnectionStatus = 'disconnected' | 'connecting' | 'connected'

/**
 * Gateway 連線狀態
 */
export interface GatewayConnectionState {
  /** 連線狀態 */
  status: GatewayConnectionStatus
  /** 連線錯誤訊息 */
  errorMessage: string | null
}

/**
 * Gateway 連線 Composable 選項
 */
export interface UseGatewayConnectionOptions {
  /**
   * 連線永久失敗時是否導向首頁
   * @default true
   */
  navigateHomeOnFailure?: boolean
}

/**
 * Gateway 連線 Composable
 *
 * @description
 * 使用 DI 注入的 GatewayEventClient 進行統一 SSE 連線管理。
 * 事件由 GatewayEventRouter 根據 domain 路由到對應的子路由器。
 *
 * 職責：
 * - 啟動/關閉 Gateway SSE 連線
 * - 管理 Vue 響應式連線狀態
 * - 同步連線狀態到 UIStateStore
 * - 連線永久失敗時導向首頁（可選）
 */
export function useGatewayConnection(options: UseGatewayConnectionOptions = {}) {
  const { navigateHomeOnFailure = true } = options

  // Vue Router
  const router = useRouter()

  // DI - 取得已組裝好的元件
  const gatewayClient = resolveDependency<GatewayEventClient>(TOKENS.GatewayEventClient)
  const uiStateStore = resolveDependency<ReturnType<typeof useUIStateStore>>(TOKENS.UIStateStore)
  const sessionContext = resolveDependency<SessionContextPort>(TOKENS.SessionContextPort)

  // Vue 響應式狀態
  const state = ref<GatewayConnectionState>({
    status: 'disconnected',
    errorMessage: null,
  })

  // 設定連線狀態回調
  gatewayClient.onConnectionEstablished(() => {
    state.value.status = 'connected'
    state.value.errorMessage = null
    uiStateStore.setConnectionStatus('connected')
    uiStateStore.hideReconnectionMessage()
  })

  gatewayClient.onConnectionLost(() => {
    state.value.status = 'disconnected'
    state.value.errorMessage = 'Connection lost'
    uiStateStore.setConnectionStatus('disconnected')
    uiStateStore.showReconnectionMessage()
  })

  gatewayClient.onConnectionFailed(() => {
    state.value.status = 'disconnected'
    state.value.errorMessage = 'Connection failed'
    uiStateStore.setConnectionStatus('disconnected')

    if (navigateHomeOnFailure) {
      // 連線永久失敗：顯示 Toast 並導向首頁
      uiStateStore.addToast({
        type: 'error',
        message: 'Connection lost. You may have opened the game in another window.',
        duration: 5000,
        dismissible: true,
      })
      // 清除 SessionContext
      sessionContext.clearSession()
      // 導向首頁
      router.push('/')
    } else {
      // 只顯示錯誤訊息
      uiStateStore.showErrorMessage('Unable to connect to game server')
    }
  })

  /**
   * 建立 Gateway SSE 連線
   *
   * @description
   * 連線到統一的 Gateway 端點。身份由 Cookie 驗證。
   * 連線成功後會收到 GatewayConnected 事件，包含玩家目前狀態。
   */
  function connect(): void {
    state.value.status = 'connecting'
    state.value.errorMessage = null
    uiStateStore.setConnectionStatus('connecting')

    // Gateway 連線不需要參數，身份由 Cookie 驗證
    gatewayClient.connect()
  }

  /**
   * 關閉連線
   */
  function disconnect(): void {
    gatewayClient.disconnect()
    state.value.status = 'disconnected'
    uiStateStore.setConnectionStatus('disconnected')
  }

  /**
   * 檢查是否已連線
   */
  function isConnected(): boolean {
    return gatewayClient.isConnected()
  }

  // 清理
  onUnmounted(() => {
    disconnect()
  })

  return {
    state,
    connect,
    disconnect,
    isConnected,
  }
}
