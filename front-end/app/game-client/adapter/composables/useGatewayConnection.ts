/**
 * useGatewayConnection - Gateway WebSocket 連線管理 Composable
 *
 * @description
 * 統一的 Gateway WebSocket 連線管理。使用單一 WebSocket 連線處理雙向通訊：
 * - 接收：Server → Client 的事件
 * - 發送：Client → Server 的命令（透過 WsSendCommandAdapter）
 *
 * Gateway Architecture:
 * - 單一 WebSocket 端點：/_ws
 * - 身份驗證：透過 session_id Cookie
 * - 事件格式：GatewayEvent（包含 domain, type, payload）
 * - 初始事件：GatewayConnected（包含玩家狀態）
 *
 * 控制流：
 * - GatewayWebSocketClient → GatewayEventRouter → Domain Routers → Use Cases
 *
 * @module app/game-client/adapter/composables/useGatewayConnection
 */

import { ref, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { resolveDependency } from '../di/resolver'
import { TOKENS } from '../di/tokens'
import type { GatewayWebSocketClient } from '../ws/GatewayWebSocketClient'
import type { useUIStateStore } from '../stores/uiState'
import type { SessionContextPort, ConnectionReadyPayload } from '../../application/ports/output'
import type { ConnectionReadyAdapter } from '../connection/ConnectionReadyAdapter'

// Re-export for consumers
export type { ConnectionReadyPayload, PlayerInitialStatus } from '../../application/ports/output'

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
 * 使用 DI 注入的 GatewayWebSocketClient 進行統一 WebSocket 連線管理。
 * 事件由 GatewayEventRouter 根據 domain 路由到對應的子路由器。
 *
 * 職責：
 * - 啟動/關閉 Gateway WebSocket 連線
 * - 管理 Vue 響應式連線狀態
 * - 同步連線狀態到 UIStateStore
 * - 連線永久失敗時導向首頁（可選）
 */
export function useGatewayConnection(options: UseGatewayConnectionOptions = {}) {
  const { navigateHomeOnFailure = true } = options

  // Vue Router
  const router = useRouter()

  // DI - 取得已組裝好的元件
  const gatewayClient = resolveDependency<GatewayWebSocketClient>(TOKENS.GatewayWebSocketClient)
  const uiStateStore = resolveDependency<ReturnType<typeof useUIStateStore>>(TOKENS.UIStateStore)
  const sessionContext = resolveDependency<SessionContextPort>(TOKENS.SessionContextPort)
  const connectionReadyAdapter = resolveDependency<ConnectionReadyAdapter>(TOKENS.ConnectionReadyPort)

  // Vue 響應式狀態
  const state = ref<GatewayConnectionState>({
    status: 'disconnected',
    errorMessage: null,
  })

  // 連線成功回調列表（WebSocket onopen 時觸發）
  const connectedCallbacks: Array<() => void | Promise<void>> = []

  // 初始狀態回調列表（GatewayConnected 事件處理完成後觸發）
  const initialStateCallbacks: Array<(payload: ConnectionReadyPayload) => void | Promise<void>> = []

  // 監聯 ConnectionReadyAdapter 的 onReady 事件
  const handleConnectionReady = async (payload: ConnectionReadyPayload) => {
    for (const callback of initialStateCallbacks) {
      try {
        await callback(payload)
      } catch (error) {
        console.error('Error in onInitialState callback:', error)
      }
    }
  }
  connectionReadyAdapter.onReady(handleConnectionReady)

  // 設定連線狀態回調（WebSocket 連線建立時）
  gatewayClient.onConnectionEstablished(async () => {
    state.value.status = 'connected'
    state.value.errorMessage = null
    uiStateStore.setConnectionStatus('connected')
    uiStateStore.hideReconnectionMessage()

    // 執行 WebSocket 連線成功回調（用於 UI 更新，不涉及業務邏輯）
    for (const callback of connectedCallbacks) {
      try {
        await callback()
      } catch (error) {
        console.error('Error in onConnected callback:', error)
      }
    }
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
   * 建立 Gateway WebSocket 連線
   *
   * @description
   * 連線到統一的 Gateway 端點 /_ws。身份由 Cookie 驗證。
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

  /**
   * 註冊連線成功回調（WebSocket onopen）
   *
   * @description
   * 在 WebSocket 連線建立後執行的回調。
   * 注意：此回調在收到 GatewayConnected 事件之前觸發，不知道玩家狀態。
   * 若需要根據玩家狀態執行邏輯，請使用 onInitialState。
   *
   * @param callback - 連線成功後執行的回調函數
   * @param options - 選項
   * @param options.once - 若為 true，回調執行一次後自動移除
   *
   * @deprecated 建議使用 onInitialState，它在收到玩家狀態後才觸發
   */
  function onConnected(
    callback: () => void | Promise<void>,
    options?: { once?: boolean }
  ): void {
    if (options?.once) {
      // 包裝回調，執行後自動移除
      const wrappedCallback = async () => {
        await callback()
        const index = connectedCallbacks.indexOf(wrappedCallback)
        if (index > -1) {
          connectedCallbacks.splice(index, 1)
        }
      }
      connectedCallbacks.push(wrappedCallback)
    } else {
      connectedCallbacks.push(callback)
    }
  }

  /**
   * 註冊初始狀態回調（GatewayConnected 事件處理完成後）
   *
   * @description
   * 在 GatewayConnected 事件處理完成後執行的回調。
   * 回調會接收玩家初始狀態（IDLE / MATCHMAKING / IN_GAME），
   * 可以根據狀態決定是否需要發送 enterMatchmaking 等命令。
   *
   * 推薦使用此方法取代 onConnected，因為它：
   * - 等待後端確認玩家狀態後才觸發
   * - 避免 WebSocket onopen 和 GatewayConnected 的時序問題
   * - 根據狀態決定行為，避免無謂的 API 調用
   *
   * @param callback - 接收玩家初始狀態的回調函數
   *
   * @example
   * ```typescript
   * gatewayConnection.onInitialState((payload) => {
   *   if (payload.status === 'IDLE' && sessionContext.hasSelectedRoom()) {
   *     // 只有在 IDLE 且有選擇房間時才發送配對命令
   *     enterMatchmaking()
   *   }
   * })
   * ```
   */
  function onInitialState(
    callback: (payload: ConnectionReadyPayload) => void | Promise<void>
  ): void {
    initialStateCallbacks.push(callback)
  }

  // 清理
  onUnmounted(() => {
    disconnect()
    // 移除 ConnectionReadyAdapter 的回調
    connectionReadyAdapter.offReady(handleConnectionReady)
  })

  return {
    state,
    connect,
    disconnect,
    isConnected,
    onConnected,
    onInitialState,
  }
}
