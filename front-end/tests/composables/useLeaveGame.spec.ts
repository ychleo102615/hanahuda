/**
 * useLeaveGame Composable Tests
 *
 * @description
 * T039 [US3]: 測試 useLeaveGame composable 的完整邏輯
 * - 狀態管理（ActionPanel, ConfirmDialog）
 * - Leave Game 流程（API 調用、狀態清除、導航）
 * - 錯誤處理
 *
 * 測試覆蓋率目標: > 80%
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useLeaveGame } from '../../src/user-interface/adapter/composables/useLeaveGame'
import { useGameStateStore } from '../../src/user-interface/adapter/stores/gameState'
import { useUIStateStore } from '../../src/user-interface/adapter/stores/uiState'
import { useMatchmakingStateStore } from '../../src/user-interface/adapter/stores/matchmakingState'
import { TOKENS } from '../../src/user-interface/adapter/di/tokens'
import { container } from '../../src/user-interface/adapter/di/container'

// Mock Vue Router
const mockPush = vi.fn()
const mockRouter = {
  push: mockPush,
}

vi.mock('vue-router', () => ({
  useRouter: () => mockRouter,
}))

// Mock SendCommandPort
const mockLeaveGame = vi.fn()
const mockSendCommandPort = {
  leaveGame: mockLeaveGame,
  playHandCard: vi.fn(),
  selectTarget: vi.fn(),
  makeDecision: vi.fn(),
}

// Mock NotificationPort
const mockNotificationPort = {
  showDecisionModal: vi.fn(),
  showGameFinishedModal: vi.fn(),
  showRoundDrawnModal: vi.fn(),
  showRoundScoredModal: vi.fn(),
  showRoundEndedInstantlyModal: vi.fn(),
  hideModal: vi.fn(),
  showErrorMessage: vi.fn(),
  showSuccessMessage: vi.fn(),
  showReconnectionMessage: vi.fn(),
  isModalVisible: vi.fn().mockReturnValue(false),
  startActionCountdown: vi.fn(),
  stopActionCountdown: vi.fn(),
  startDisplayCountdown: vi.fn(),
  stopDisplayCountdown: vi.fn(),
  cleanup: vi.fn(),
}

describe('useLeaveGame Composable', () => {
  let gameStateStore: ReturnType<typeof useGameStateStore>
  let uiStateStore: ReturnType<typeof useUIStateStore>
  let matchmakingStateStore: ReturnType<typeof useMatchmakingStateStore>

  beforeEach(() => {
    // 建立新的 Pinia 實例
    setActivePinia(createPinia())

    // 取得 stores
    gameStateStore = useGameStateStore()
    uiStateStore = useUIStateStore()
    matchmakingStateStore = useMatchmakingStateStore()

    // Mock container.resolve()
    vi.spyOn(container, 'resolve').mockImplementation((token) => {
      if (token === TOKENS.SendCommandPort) {
        return mockSendCommandPort
      }
      if (token === TOKENS.NotificationPort) {
        return mockNotificationPort
      }
      throw new Error(`Unmocked dependency: ${token.toString()}`)
    })

    // 清除 mocks
    mockPush.mockClear()
    mockLeaveGame.mockClear()

    // 清除 sessionStorage
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('基本功能', () => {
    it('應該返回所有必要的屬性和方法', () => {
      const leaveGame = useLeaveGame()

      expect(leaveGame).toHaveProperty('isActionPanelOpen')
      expect(leaveGame).toHaveProperty('isConfirmDialogOpen')
      expect(leaveGame).toHaveProperty('menuItems')
      expect(leaveGame).toHaveProperty('toggleActionPanel')
      expect(leaveGame).toHaveProperty('closeActionPanel')
      expect(leaveGame).toHaveProperty('handleLeaveGameClick')
      expect(leaveGame).toHaveProperty('handleLeaveGameConfirm')
      expect(leaveGame).toHaveProperty('handleLeaveGameCancel')
    })

    it('初始狀態應該是關閉的', () => {
      const leaveGame = useLeaveGame()

      expect(leaveGame.isActionPanelOpen.value).toBe(false)
      expect(leaveGame.isConfirmDialogOpen.value).toBe(false)
    })

    it('menuItems 應該包含 Leave Game 選項', () => {
      const leaveGame = useLeaveGame()

      expect(leaveGame.menuItems).toHaveLength(1)
      expect(leaveGame.menuItems[0]).toMatchObject({
        id: 'leave-game',
        label: 'Leave Game',
        icon: '🚪',
      })
    })
  })

  describe('ActionPanel 控制', () => {
    it('toggleActionPanel 應該切換面板狀態', () => {
      const leaveGame = useLeaveGame()

      expect(leaveGame.isActionPanelOpen.value).toBe(false)

      leaveGame.toggleActionPanel()
      expect(leaveGame.isActionPanelOpen.value).toBe(true)

      leaveGame.toggleActionPanel()
      expect(leaveGame.isActionPanelOpen.value).toBe(false)
    })

    it('closeActionPanel 應該關閉面板', () => {
      const leaveGame = useLeaveGame()

      leaveGame.toggleActionPanel() // 打開
      expect(leaveGame.isActionPanelOpen.value).toBe(true)

      leaveGame.closeActionPanel()
      expect(leaveGame.isActionPanelOpen.value).toBe(false)
    })
  })

  describe('ConfirmDialog 控制 (requireConfirmation = true)', () => {
    it('handleLeaveGameClick 應該打開確認對話框', () => {
      const leaveGame = useLeaveGame({ requireConfirmation: true })

      leaveGame.handleLeaveGameClick()

      expect(leaveGame.isConfirmDialogOpen.value).toBe(true)
    })

    it('handleLeaveGameCancel 應該關閉確認對話框', () => {
      const leaveGame = useLeaveGame({ requireConfirmation: true })

      leaveGame.handleLeaveGameClick() // 打開
      expect(leaveGame.isConfirmDialogOpen.value).toBe(true)

      leaveGame.handleLeaveGameCancel() // 關閉
      expect(leaveGame.isConfirmDialogOpen.value).toBe(false)
    })
  })

  describe('直接執行 (requireConfirmation = false)', () => {
    it('handleLeaveGameClick 應該直接執行退出邏輯', async () => {
      gameStateStore.gameId = 'test-game-123'
      sessionStorage.setItem('session_token', 'test-token')
      mockLeaveGame.mockResolvedValue(undefined)

      const leaveGame = useLeaveGame({ requireConfirmation: false })

      await leaveGame.handleLeaveGameClick()

      // 驗證 API 被調用
      expect(mockLeaveGame).toHaveBeenCalledWith('test-game-123')

      // 驗證狀態被清除
      expect(sessionStorage.getItem('session_token')).toBeNull()
      expect(gameStateStore.gameId).toBeNull()

      // 驗證導航
      expect(mockPush).toHaveBeenCalledWith('/')
    })
  })

  describe('完整 Leave Game 流程', () => {
    beforeEach(() => {
      gameStateStore.gameId = 'test-game-123'
      sessionStorage.setItem('session_token', 'test-token')
    })

    it('成功流程：應該調用 API、清除狀態、導航', async () => {
      mockLeaveGame.mockResolvedValue(undefined)

      const leaveGame = useLeaveGame({ requireConfirmation: true })

      await leaveGame.handleLeaveGameConfirm()

      // 驗證 1: leaveGame API 被調用
      expect(mockLeaveGame).toHaveBeenCalledWith('test-game-123')
      expect(mockLeaveGame).toHaveBeenCalledTimes(1)

      // 驗證 2: sessionStorage 被清除
      expect(sessionStorage.getItem('session_token')).toBeNull()

      // 驗證 3: stores 被重置
      expect(gameStateStore.gameId).toBeNull()

      // 驗證 4: 導航到首頁
      expect(mockPush).toHaveBeenCalledWith('/')
      expect(mockPush).toHaveBeenCalledTimes(1)
    })

    it('API 失敗時仍應清除狀態並導航', async () => {
      mockLeaveGame.mockRejectedValue(new Error('API Error'))

      const leaveGame = useLeaveGame({ requireConfirmation: true })

      await leaveGame.handleLeaveGameConfirm()

      // 驗證 API 被調用
      expect(mockLeaveGame).toHaveBeenCalledWith('test-game-123')

      // 驗證即使 API 失敗，仍然清除狀態並導航
      expect(sessionStorage.getItem('session_token')).toBeNull()
      expect(gameStateStore.gameId).toBeNull()
      expect(mockPush).toHaveBeenCalledWith('/')
    })

    it('沒有 gameId 時應該跳過 API 調用但仍清除狀態', async () => {
      gameStateStore.gameId = null

      const leaveGame = useLeaveGame({ requireConfirmation: true })

      await leaveGame.handleLeaveGameConfirm()

      // 驗證 API 沒有被調用
      expect(mockLeaveGame).not.toHaveBeenCalled()

      // 驗證仍然清除狀態並導航
      expect(sessionStorage.getItem('session_token')).toBeNull()
      expect(mockPush).toHaveBeenCalledWith('/')
    })

    it('執行後應該關閉對話框和面板', async () => {
      mockLeaveGame.mockResolvedValue(undefined)

      const leaveGame = useLeaveGame({ requireConfirmation: true })

      // 打開面板和對話框
      leaveGame.toggleActionPanel()
      leaveGame.handleLeaveGameClick()
      expect(leaveGame.isActionPanelOpen.value).toBe(true)
      expect(leaveGame.isConfirmDialogOpen.value).toBe(true)

      // 執行確認
      await leaveGame.handleLeaveGameConfirm()

      // 驗證都已關閉
      expect(leaveGame.isActionPanelOpen.value).toBe(false)
      expect(leaveGame.isConfirmDialogOpen.value).toBe(false)
    })
  })

  describe('狀態清除', () => {
    it('應該清除所有 stores', async () => {
      // 設置初始狀態
      gameStateStore.gameId = 'test-game-123'
      uiStateStore.infoMessage = 'Test message'
      matchmakingStateStore.sessionToken = 'test-token'

      mockLeaveGame.mockResolvedValue(undefined)

      const leaveGame = useLeaveGame()

      await leaveGame.handleLeaveGameConfirm()

      // 驗證所有 stores 都被重置
      expect(gameStateStore.gameId).toBeNull()
      expect(uiStateStore.infoMessage).toBeNull()
      expect(matchmakingStateStore.sessionToken).toBeNull()
    })
  })
})
