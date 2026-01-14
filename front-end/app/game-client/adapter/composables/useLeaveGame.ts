/**
 * useLeaveGame Composable
 *
 * @description
 * 可重用的遊戲操作邏輯，供 GamePage 和 GameFinishedModal 使用。
 * 處理：Rematch（重新配對）、Leave Game（離開遊戲）、Close Modal（關閉 Modal）。
 *
 * @usage
 * const { handleRematch, handleLeaveGame, menuItems } = useLeaveGame()
 */

import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useGameStateStore } from '../stores/gameState'
import { useUIStateStore } from '../stores/uiState'
import { useMatchmakingStateStore } from '../stores/matchmakingState'
import { resolveDependency } from '../di/resolver'
import { TOKENS } from '../di/tokens'
import type { SendCommandPort, NotificationPort, SessionContextPort } from '../../application/ports/output'
import type { RoomTypeId } from '~~/shared/constants/roomTypes'
import type { MenuItem } from '../types/menu-item'
import type { useGatewayConnection } from './useGatewayConnection'

export interface UseLeaveGameOptions {
  /** 是否需要確認對話框（預設: false） */
  requireConfirmation?: boolean
  /** Gateway 連線實例（用於 Rematch 直接重連） */
  gatewayConnection?: ReturnType<typeof useGatewayConnection> | null
}

export function useLeaveGame(options: UseLeaveGameOptions = {}) {
  const { requireConfirmation = false, gatewayConnection = null } = options

  // Dependencies
  const router = useRouter()
  const gameState = useGameStateStore()
  const uiState = useUIStateStore()
  const matchmakingState = useMatchmakingStateStore()
  const gameApiClient = resolveDependency<SendCommandPort>(TOKENS.SendCommandPort)
  const notification = resolveDependency<NotificationPort>(TOKENS.NotificationPort)
  const sessionContext = resolveDependency<SessionContextPort>(TOKENS.SessionContextPort)

  // 響應式狀態
  const { gameEnded } = storeToRefs(gameState)

  // State
  const isActionPanelOpen = ref(false)
  const isConfirmDialogOpen = ref(false)
  const isRematching = ref(false)

  // 監聽遊戲結束 modal，自動關閉離開確認對話框
  watch(
    () => uiState.gameFinishedModalVisible || uiState.roundScoredModalVisible || uiState.roundDrawnModalVisible || uiState.roundEndedInstantlyModalVisible,
    (isAnyEndModalVisible) => {
      if (isAnyEndModalVisible && isConfirmDialogOpen.value) {
        isConfirmDialogOpen.value = false
      }
    }
  )

  // Menu Items (computed for dynamic state)
  const menuItems = computed<MenuItem[]>(() => {
    const isFinished = gameEnded.value
    const items: MenuItem[] = []

    // Rematch（遊戲結束後可用）
    items.push({
      id: 'rematch',
      label: 'Rematch',
      icon: 'refresh',
      onClick: () => {
        isActionPanelOpen.value = false
        handleRematch()
      },
      disabled: !isFinished || isRematching.value,
    })

    // Leave Game
    items.push({
      id: 'leave-game',
      label: 'Leave Game',
      icon: 'door-exit',
      onClick: handleLeaveGameClick,
    })

    return items
  })

  // Handlers
  function toggleActionPanel() {
    isActionPanelOpen.value = !isActionPanelOpen.value
  }

  function closeActionPanel() {
    isActionPanelOpen.value = false
  }

  function handleLeaveGameClick() {
    // 遊戲已結束時，跳過確認對話框
    if (gameEnded.value) {
      handleLeaveGameConfirm()
      return
    }

    if (requireConfirmation) {
      // 顯示確認對話框
      isConfirmDialogOpen.value = true
    } else {
      // 直接執行退出流程
      handleLeaveGameConfirm()
    }
  }

  async function handleLeaveGameConfirm() {
    try {
      // 關閉對話框和面板
      isConfirmDialogOpen.value = false
      isActionPanelOpen.value = false

      // 檢查遊戲是否已結束 - 若已結束，跳過 API 調用
      if (gameEnded.value) {
        clearLocalStateAndNavigate()
        return
      }

      // 從 gameState 取得 currentGameId
      const gameId = gameState.currentGameId
      if (!gameId) {
        // 即使沒有 gameId，仍然清除本地狀態並導航回首頁
        clearLocalStateAndNavigate()
        return
      }

      // 調用 leaveGame API
      if (gameApiClient) {
        try {
          await gameApiClient.leaveGame(gameId)
        } catch {
          // 即使 API 失敗，仍然清除本地狀態並導航
        }
      } else {
      }

      // 清除本地狀態並導航
      clearLocalStateAndNavigate()
    } catch {
      // 發生任何錯誤，仍然嘗試清除狀態並導航
      clearLocalStateAndNavigate()
    }
  }

  function handleLeaveGameCancel() {
    isConfirmDialogOpen.value = false
  }

  /**
   * Rematch - 使用相同房間類型重新配對
   *
   * @description
   * 遊戲結束後 WebSocket 已斷線，因此 Rematch 需要重新建立連線。
   * 流程：
   * 1. 取得 roomTypeId（從 gameState）
   * 2. 設定 pendingRoomTypeId
   * 3. 重置 stores 並設定配對狀態
   * 4. 重新建立 WebSocket 連線
   * 5. Game 頁面 onConnected 回調會偵測 pendingRoomTypeId 並發送配對命令
   */
  async function handleRematch(): Promise<void> {
    // 取得 roomTypeId（從 gameState，由 SSE 事件設定）
    const roomTypeId = gameState.roomTypeId
    if (!roomTypeId) {
      // 沒有 roomTypeId，導航回 lobby
      uiState.addToast({
        type: 'error',
        message: 'Unable to rematch. Please select a game mode.',
        duration: 3000,
        dismissible: true,
      })
      navigateTo('/lobby')
      return
    }

    isRematching.value = true

    // 1. 隱藏 GameFinishedModal
    uiState.hideGameFinishedModal()

    // 2. 設定 pendingRoomTypeId（供連線成功後使用）
    sessionContext.setPendingRoomTypeId(roomTypeId as RoomTypeId)

    // 3. 重置遊戲狀態
    gameState.$reset()
    uiState.$reset()
    matchmakingState.$reset()

    // 4. 設定配對狀態為 searching（讓 UI 顯示配對中覆蓋層）
    matchmakingState.setStatus('searching')

    // 5. 重新建立 WebSocket 連線
    // onConnected 回調會偵測 pendingRoomTypeId 並發送 JOIN_MATCHMAKING
    if (gatewayConnection) {
      gatewayConnection.connect()
    } else {
      // 降級方案：導航回 /game 觸發 onMounted 重新連線
      navigateTo('/game')
    }

    isRematching.value = false
  }

  function clearLocalStateAndNavigate() {
    // 清除 SessionContext 中的會話資訊（entryId）
    sessionContext.clearSession()

    // 清理通知系統資源（倒數計時器等）
    notification.cleanup()

    // 清除所有 stores
    gameState.$reset()
    uiState.$reset()
    matchmakingState.$reset()

    // 導航回首頁
    router.push('/')
  }

  return {
    // State
    isActionPanelOpen,
    isConfirmDialogOpen,
    isRematching,

    // Menu Items
    menuItems,

    // Methods
    toggleActionPanel,
    closeActionPanel,
    handleLeaveGameClick,
    handleLeaveGameConfirm,
    handleLeaveGameCancel,
    handleRematch,
  }
}
