/**
 * GamePage Integration Tests - Leave Game Flow
 *
 * @description
 * T039 [US3]: 整合測試完整退出遊戲流程
 * 測試 Leave Game 的完整 user flow：
 * 1. 點擊選單按鈕 → ActionPanel 打開
 * 2. 點擊 "Leave Game" → ConfirmDialog 打開
 * 3. 點擊 "Leave" 確認 → 執行退出流程
 * 4. 驗證 API 調用、狀態清除、導航
 *
 * 測試覆蓋率目標: > 80%
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import GamePage from '../../src/views/GamePage.vue'
import { useGameStateStore } from '../../src/user-interface/adapter/stores/gameState'
import { useUIStateStore } from '../../src/user-interface/adapter/stores/uiState'
import { useMatchmakingStateStore } from '../../src/user-interface/adapter/stores/matchmakingState'
import { TOKENS } from '../../src/user-interface/adapter/di/tokens'

// Mock Vue Router
const mockPush = vi.fn()
const mockRouter = {
  push: mockPush,
}

vi.mock('vue-router', () => ({
  useRouter: () => mockRouter,
}))

// Mock GameApiClient
const mockLeaveGame = vi.fn()
const mockGameApiClient = {
  leaveGame: mockLeaveGame,
}

// 輔助函數：在 document 中查找元素（支持 Teleport）
const findInDocument = (selector: string): Element | null => {
  return document.querySelector(selector)
}

describe('GamePage - Leave Game Integration Tests', () => {
  let wrapper: VueWrapper<any>
  let gameStateStore: ReturnType<typeof useGameStateStore>
  let uiStateStore: ReturnType<typeof useUIStateStore>
  let matchmakingStateStore: ReturnType<typeof useMatchmakingStateStore>

  beforeEach(() => {
    // 清理 DOM
    document.body.innerHTML = ''

    // 建立新的 Pinia 實例
    setActivePinia(createPinia())

    // 取得 stores
    gameStateStore = useGameStateStore()
    uiStateStore = useUIStateStore()
    matchmakingStateStore = useMatchmakingStateStore()

    // 清除 mocks
    mockPush.mockClear()
    mockLeaveGame.mockClear()

    // 清除 sessionStorage
    sessionStorage.clear()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    // 清理 DOM
    document.body.innerHTML = ''
    // 恢復 body overflow
    document.body.style.overflow = ''
    vi.restoreAllMocks()
  })

  describe('T039 [US3]: 完整 Leave Game 流程', () => {
    beforeEach(() => {
      // 設置初始遊戲狀態
      gameStateStore.gameId = 'test-game-123'
      sessionStorage.setItem('session_token', 'test-token')
      sessionStorage.setItem('gameMode', 'mock')

      // Mock GameApiClient injection
      wrapper = mount(GamePage, {
        attachTo: document.body,
        global: {
          provide: {
            [TOKENS.GameApiClient]: mockGameApiClient,
            [TOKENS.SendCommandPort.toString()]: {
              joinGame: vi.fn().mockResolvedValue(undefined),
            },
            [TOKENS.MockEventEmitter.toString()]: {
              start: vi.fn(),
            },
            // Mock 其他必要的依賴
            [TOKENS.DomainFacade]: {},
            [TOKENS.PlayHandCardPort]: {},
            [TOKENS.SelectMatchTargetPort]: {},
            [TOKENS.AnimationPort]: {},
            [TOKENS.MakeKoiKoiDecisionPort]: {},
            [TOKENS.GameStatePort]: {},
            [TOKENS.NotificationPort]: {},
          },
          stubs: {
            // Stub 掉不需要測試的子組件
            TopInfoBar: true,
            FieldZone: true,
            PlayerHandZone: true,
            OpponentDepositoryZone: true,
            PlayerDepositoryZone: true,
            DeckZone: true,
            DecisionModal: true,
            ErrorToast: true,
            GameFinishedModal: true,
            RoundEndModal: true,
            ReconnectionBanner: true,
            AnimationLayer: true,
            ConfirmationHint: true,
          },
        },
      })
    })

    it('應該顯示選單按鈕', async () => {
      await wrapper.vm.$nextTick()

      const menuButton = wrapper.find('[data-testid="menu-button"]')
      expect(menuButton.exists()).toBe(true)
    })

    it('點擊選單按鈕應該打開 ActionPanel', async () => {
      await wrapper.vm.$nextTick()

      // 點擊選單按鈕
      const menuButton = wrapper.find('[data-testid="menu-button"]')
      await menuButton.trigger('click')
      await wrapper.vm.$nextTick()

      // 驗證 ActionPanel 打開
      const actionPanel = findInDocument('[data-testid="action-panel"]')
      expect(actionPanel).not.toBeNull()
    })

    it('ActionPanel 應該包含 Leave Game 選項', async () => {
      await wrapper.vm.$nextTick()

      // 打開 ActionPanel
      const menuButton = wrapper.find('[data-testid="menu-button"]')
      await menuButton.trigger('click')
      await wrapper.vm.$nextTick()

      // 等待 ActionPanel 渲染
      await new Promise(resolve => setTimeout(resolve, 100))

      // 驗證 Leave Game 選項存在
      const menuItems = document.querySelectorAll('[data-testid^="menu-item-"]')
      const leaveGameItem = Array.from(menuItems).find(
        item => item.textContent?.includes('Leave Game')
      )
      expect(leaveGameItem).not.toBeNull()
    })

    it('點擊 Leave Game 應該打開確認對話框', async () => {
      await wrapper.vm.$nextTick()

      // 打開 ActionPanel
      const menuButton = wrapper.find('[data-testid="menu-button"]')
      await menuButton.trigger('click')
      await wrapper.vm.$nextTick()

      // 等待 ActionPanel 動畫完成
      await new Promise(resolve => setTimeout(resolve, 300))

      // 點擊 Leave Game - 使用 Vue Test Utils 的方式
      const actionPanel = wrapper.findComponent({ name: 'ActionPanel' })
      expect(actionPanel.exists()).toBe(true)

      // 觸發 menu item 的 click 事件
      const leaveGameButton = document.querySelector('[data-testid="menu-item-leave-game"]') as HTMLElement
      if (leaveGameButton) {
        leaveGameButton.click()
      }

      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 300))

      // 驗證 ConfirmDialog 打開
      const confirmDialog = findInDocument('[data-testid="confirm-dialog"]')
      expect(confirmDialog).not.toBeNull()

      // 驗證對話框內容
      const dialogTitle = findInDocument('[data-testid="dialog-title"]')
      const dialogMessage = findInDocument('[data-testid="dialog-message"]')
      expect(dialogTitle?.textContent).toContain('Leave Game')
      expect(dialogMessage?.textContent).toContain('Are you sure')
    })

    it('點擊 Cancel 應該關閉確認對話框', async () => {
      await wrapper.vm.$nextTick()

      // 打開 ActionPanel
      const menuButton = wrapper.find('[data-testid="menu-button"]')
      await menuButton.trigger('click')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      // 點擊 Leave Game
      const menuItems = document.querySelectorAll('[data-testid^="menu-item-"]')
      const leaveGameItem = Array.from(menuItems).find(
        item => item.textContent?.includes('Leave Game')
      ) as HTMLElement
      leaveGameItem?.click()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      // 點擊 Cancel
      const cancelButton = findInDocument('[data-testid="cancel-button"]') as HTMLElement
      cancelButton?.click()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      // 驗證對話框關閉
      const confirmDialog = findInDocument('[data-testid="confirm-dialog"]')
      expect(confirmDialog).toBeNull()

      // 驗證沒有調用 API
      expect(mockLeaveGame).not.toHaveBeenCalled()
      expect(mockPush).not.toHaveBeenCalled()
    })

    it('完整流程：點擊 Confirm 應該執行退出遊戲', async () => {
      // 設置 leaveGame mock 成功
      mockLeaveGame.mockResolvedValue(undefined)

      await wrapper.vm.$nextTick()

      // 步驟 1: 打開 ActionPanel
      const menuButton = wrapper.find('[data-testid="menu-button"]')
      await menuButton.trigger('click')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      // 步驟 2: 點擊 Leave Game
      const menuItems = document.querySelectorAll('[data-testid^="menu-item-"]')
      const leaveGameItem = Array.from(menuItems).find(
        item => item.textContent?.includes('Leave Game')
      ) as HTMLElement
      leaveGameItem?.click()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      // 步驟 3: 點擊 Confirm
      const confirmButton = findInDocument('[data-testid="confirm-button"]') as HTMLElement
      confirmButton?.click()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

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
      // 設置 leaveGame mock 失敗
      mockLeaveGame.mockRejectedValue(new Error('API Error'))

      await wrapper.vm.$nextTick()

      // 打開 ActionPanel
      const menuButton = wrapper.find('[data-testid="menu-button"]')
      await menuButton.trigger('click')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      // 點擊 Leave Game
      const menuItems = document.querySelectorAll('[data-testid^="menu-item-"]')
      const leaveGameItem = Array.from(menuItems).find(
        item => item.textContent?.includes('Leave Game')
      ) as HTMLElement
      leaveGameItem?.click()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      // 點擊 Confirm
      const confirmButton = findInDocument('[data-testid="confirm-button"]') as HTMLElement
      confirmButton?.click()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      // 驗證 API 被調用
      expect(mockLeaveGame).toHaveBeenCalledWith('test-game-123')

      // 驗證即使 API 失敗，仍然清除狀態並導航
      expect(sessionStorage.getItem('session_token')).toBeNull()
      expect(gameStateStore.gameId).toBeNull()
      expect(mockPush).toHaveBeenCalledWith('/')
    })

    it('沒有 gameId 時應該跳過 API 調用但仍清除狀態', async () => {
      // 清除 gameId
      gameStateStore.gameId = null

      await wrapper.vm.$nextTick()

      // 打開 ActionPanel
      const menuButton = wrapper.find('[data-testid="menu-button"]')
      await menuButton.trigger('click')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      // 點擊 Leave Game
      const menuItems = document.querySelectorAll('[data-testid^="menu-item-"]')
      const leaveGameItem = Array.from(menuItems).find(
        item => item.textContent?.includes('Leave Game')
      ) as HTMLElement
      leaveGameItem?.click()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      // 點擊 Confirm
      const confirmButton = findInDocument('[data-testid="confirm-button"]') as HTMLElement
      confirmButton?.click()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      // 驗證 API 沒有被調用
      expect(mockLeaveGame).not.toHaveBeenCalled()

      // 驗證仍然清除狀態並導航
      expect(sessionStorage.getItem('session_token')).toBeNull()
      expect(mockPush).toHaveBeenCalledWith('/')
    })
  })

  describe('背景滾動控制', () => {
    beforeEach(() => {
      gameStateStore.gameId = 'test-game-123'
      sessionStorage.setItem('gameMode', 'mock')

      wrapper = mount(GamePage, {
        attachTo: document.body,
        global: {
          provide: {
            [TOKENS.GameApiClient]: mockGameApiClient,
            [TOKENS.SendCommandPort.toString()]: {
              joinGame: vi.fn().mockResolvedValue(undefined),
            },
            [TOKENS.MockEventEmitter.toString()]: {
              start: vi.fn(),
            },
            // Mock 其他必要的依賴
            [TOKENS.DomainFacade]: {},
            [TOKENS.PlayHandCardPort]: {},
            [TOKENS.SelectMatchTargetPort]: {},
            [TOKENS.AnimationPort]: {},
            [TOKENS.MakeKoiKoiDecisionPort]: {},
            [TOKENS.GameStatePort]: {},
            [TOKENS.NotificationPort]: {},
          },
          stubs: {
            // Stub 掉不需要測試的子組件
            TopInfoBar: true,
            FieldZone: true,
            PlayerHandZone: true,
            OpponentDepositoryZone: true,
            PlayerDepositoryZone: true,
            DeckZone: true,
            DecisionModal: true,
            ErrorToast: true,
            GameFinishedModal: true,
            RoundEndModal: true,
            ReconnectionBanner: true,
            AnimationLayer: true,
            ConfirmationHint: true,
          },
        },
      })
    })

    it('打開確認對話框時應該禁止背景滾動', async () => {
      await wrapper.vm.$nextTick()

      // 打開 ActionPanel
      const menuButton = wrapper.find('[data-testid="menu-button"]')
      await menuButton.trigger('click')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      // 點擊 Leave Game
      const menuItems = document.querySelectorAll('[data-testid^="menu-item-"]')
      const leaveGameItem = Array.from(menuItems).find(
        item => item.textContent?.includes('Leave Game')
      ) as HTMLElement
      leaveGameItem?.click()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      // 驗證背景滾動被禁止
      expect(document.body.style.overflow).toBe('hidden')
    })

    it('關閉確認對話框時應該恢復背景滾動', async () => {
      await wrapper.vm.$nextTick()

      // 打開 ActionPanel
      const menuButton = wrapper.find('[data-testid="menu-button"]')
      await menuButton.trigger('click')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      // 點擊 Leave Game
      const menuItems = document.querySelectorAll('[data-testid^="menu-item-"]')
      const leaveGameItem = Array.from(menuItems).find(
        item => item.textContent?.includes('Leave Game')
      ) as HTMLElement
      leaveGameItem?.click()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      // 驗證背景滾動被禁止
      expect(document.body.style.overflow).toBe('hidden')

      // 點擊 Cancel
      const cancelButton = findInDocument('[data-testid="cancel-button"]') as HTMLElement
      cancelButton?.click()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      // 驗證背景滾動恢復
      expect(document.body.style.overflow).toBe('')
    })
  })
})
