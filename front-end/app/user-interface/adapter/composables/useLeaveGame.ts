/**
 * useLeaveGame Composable
 *
 * @description
 * 可重用的 Leave Game 邏輯，供 GameLobby 和 GamePage 使用。
 * 處理完整的退出遊戲流程：確認對話框、API 調用、狀態清除、導航。
 *
 * @usage
 * // GamePage (需要確認對話框)
 * const leaveGame = useLeaveGame({ requireConfirmation: true })
 *
 * // GameLobby (直接離開)
 * const leaveGame = useLeaveGame({ requireConfirmation: false })
 */

import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStateStore } from '../stores/gameState'
import { useUIStateStore } from '../stores/uiState'
import { useMatchmakingStateStore } from '../stores/matchmakingState'
import { useDependency } from './useDependency'
import { TOKENS } from '../di/tokens'
import type { SendCommandPort, NotificationPort, SessionContextPort } from '../../application/ports/output'
import type { ActionPanelItem } from '~/components/ActionPanel.vue'

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

  // State
  const isActionPanelOpen = ref(false)
  const isConfirmDialogOpen = ref(false)

  // Menu Items
  const menuItems: ActionPanelItem[] = [
    {
      id: 'leave-game',
      label: 'Leave Game',
      icon: '🚪',
      onClick: handleLeaveGameClick,
    },
  ]

  // Handlers
  function toggleActionPanel() {
    isActionPanelOpen.value = !isActionPanelOpen.value
  }

  function closeActionPanel() {
    isActionPanelOpen.value = false
  }

  function handleLeaveGameClick() {
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

      // 從 SessionContext 取得 gameId
      const gameId = sessionContext.getGameId()
      if (!gameId) {
        console.warn('[useLeaveGame] 無法退出遊戲：找不到 gameId')
        // 即使沒有 gameId，仍然清除本地狀態並導航回首頁
        clearLocalStateAndNavigate()
        return
      }

      // 檢查遊戲是否已結束 - 若已結束，跳過 API 調用
      if (sessionContext.isGameFinished()) {
        console.info('[useLeaveGame] 遊戲已結束，跳過 leaveGame API')
        clearLocalStateAndNavigate()
        return
      }

      // 調用 leaveGame API
      if (gameApiClient) {
        try {
          await gameApiClient.leaveGame(gameId)
          console.info('[useLeaveGame] 成功調用 leaveGame API')
        } catch (error) {
          console.error('[useLeaveGame] leaveGame API 失敗:', error)
          // 即使 API 失敗，仍然清除本地狀態並導航
        }
      } else {
        console.warn('[useLeaveGame] GameApiClient 未注入')
      }

      // 清除本地狀態並導航
      clearLocalStateAndNavigate()
    } catch (error) {
      console.error('[useLeaveGame] 退出遊戲流程失敗:', error)
      // 發生任何錯誤，仍然嘗試清除狀態並導航
      clearLocalStateAndNavigate()
    }
  }

  function handleLeaveGameCancel() {
    isConfirmDialogOpen.value = false
  }

  function clearLocalStateAndNavigate() {
    // 清除 SessionContext 中的 session 識別資訊
    // 注意：session_token Cookie 已由後端 API 清除
    sessionContext.clearIdentity()

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

    // Menu Items
    menuItems,

    // Methods
    toggleActionPanel,
    closeActionPanel,
    handleLeaveGameClick,
    handleLeaveGameConfirm,
    handleLeaveGameCancel,
  }
}
