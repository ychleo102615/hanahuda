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

import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useGameStateStore } from '../stores/gameState'
import { useUIStateStore } from '../stores/uiState'
import { useMatchmakingStateStore } from '../stores/matchmakingState'
import { useDependency, useOptionalDependency } from './useDependency'
import { TOKENS } from '../di/tokens'
import type { SendCommandPort, NotificationPort, SessionContextPort } from '../../application/ports/output'
import { MatchmakingError, type MatchmakingApiClient } from '../api/MatchmakingApiClient'
import type { RoomTypeId } from '~~/shared/constants/roomTypes'
import type { MenuItem } from '~/components/menu/types'

/**
 * 配對錯誤代碼對應的使用者友善訊息
 */
const MATCHMAKING_ERROR_MESSAGES: Record<string, string> = {
  ALREADY_IN_QUEUE: 'You are already in the matchmaking queue.',
  ALREADY_IN_GAME: 'You are already in a game.',
  INVALID_ROOM_TYPE: 'Invalid game mode selected.',
  UNAUTHORIZED: 'Session expired. Please refresh the page.',
  NETWORK_ERROR: 'Connection error. Please check your network.',
}

export interface UseLeaveGameOptions {
  /** 是否需要確認對話框（預設: false） */
  requireConfirmation?: boolean
}

export function useLeaveGame(options: UseLeaveGameOptions = {}) {
  const { requireConfirmation = false } = options

  // Dependencies
  const router = useRouter()
  const gameState = useGameStateStore()
  const uiState = useUIStateStore()
  const matchmakingState = useMatchmakingStateStore()
  const gameApiClient = useDependency<SendCommandPort>(TOKENS.SendCommandPort)
  const notification = useDependency<NotificationPort>(TOKENS.NotificationPort)
  const sessionContext = useDependency<SessionContextPort>(TOKENS.SessionContextPort)
  const matchmakingApiClient = useOptionalDependency<MatchmakingApiClient>(TOKENS.MatchmakingApiClient)

  // 響應式狀態
  const { gameEnded } = storeToRefs(gameState)

  // State
  const isActionPanelOpen = ref(false)
  const isConfirmDialogOpen = ref(false)
  const isRematching = ref(false)

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
   * 1. 隱藏 GameFinishedModal
   * 2. 重置遊戲狀態（保留 identity）
   * 3. 從 SessionContext 取得 roomTypeId
   * 4. 呼叫配對 API
   * 5. MatchmakingStatusOverlay 會自動顯示
   */
  async function handleRematch(): Promise<void> {
    // 取得 roomTypeId
    const roomTypeId = sessionContext.getRoomTypeId()
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

    // 沒有 matchmakingApiClient，導航回 lobby
    if (!matchmakingApiClient) {
      navigateTo('/lobby')
      return
    }

    isRematching.value = true

    try {
      // 1. 隱藏 GameFinishedModal
      uiState.hideGameFinishedModal()

      // 2. 重置遊戲狀態（保留 roomTypeId）
      gameState.$reset()
      uiState.$reset()
      matchmakingState.$reset()

      // 4. 設定配對狀態
      matchmakingState.setStatus('finding')

      // 5. 呼叫配對 API
      const entryId = await matchmakingApiClient.enterMatchmaking(roomTypeId as RoomTypeId)

      // 6. 儲存 entryId（供取消配對使用）
      sessionContext.setEntryId(entryId)

      // 7. 配對請求成功，重置 isRematching（配對中會顯示 overlay，不需要再禁用按鈕）
      isRematching.value = false

      // MatchmakingStatusOverlay 會自動顯示（因為 matchmakingState.status === 'finding'）
    } catch (error: unknown) {
      isRematching.value = false
      matchmakingState.setStatus('idle')

      // 根據錯誤類型顯示對應的 toast 訊息
      let errorMessage = 'Failed to start rematch. Please try again.'

      if (error instanceof MatchmakingError) {
        errorMessage = MATCHMAKING_ERROR_MESSAGES[error.errorCode] ?? error.message
      } else if (error instanceof Error) {
        errorMessage = error.message
      }

      uiState.addToast({
        type: 'error',
        message: errorMessage,
        duration: 5000,
        dismissible: true,
      })
    }
  }

  function clearLocalStateAndNavigate() {
    // 清除 SessionContext 中的會話資訊（roomTypeId、entryId）
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
