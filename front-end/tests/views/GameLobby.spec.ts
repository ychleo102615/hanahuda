/**
 * GameLobby Component Tests
 *
 * @description
 * 測試 GameLobby.vue 組件的所有功能
 * - 三種狀態 UI（idle、finding、error）
 * - Find Match 按鈕
 * - UX 倒數計時器（30秒）
 * - 配對錯誤重試按鈕
 *
 * 測試覆蓋率目標: > 80%
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import GameLobby from '../../src/views/GameLobby.vue'
import { useMatchmakingStateStore } from '../../src/user-interface/adapter/stores/matchmakingState'

// Mock Vue Router
const mockPush = vi.fn()
const mockRouter = {
  push: mockPush,
}

// Mock useRouter before importing the component
vi.mock('vue-router', () => ({
  useRouter: () => mockRouter,
}))

describe('GameLobby', () => {
  let wrapper: VueWrapper<any>

  beforeEach(() => {
    // 建立新的 Pinia 實例
    setActivePinia(createPinia())
    vi.useFakeTimers()
    // 清除 router mock
    mockPush.mockClear()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  describe('初始狀態（idle）', () => {
    it('應該顯示大廳標題', async () => {
      wrapper = mount(GameLobby)
      await wrapper.vm.$nextTick()

      const title = wrapper.find('[data-testid="lobby-title"]')
      expect(title.exists()).toBe(true)
      expect(title.text()).toContain('Game Lobby')
    })

    it('應該顯示 Find Match 按鈕', async () => {
      wrapper = mount(GameLobby)
      await wrapper.vm.$nextTick()

      const button = wrapper.find('[data-testid="find-match-button"]')
      expect(button.exists()).toBe(true)
      expect(button.text()).toContain('Find Match')
    })

    it('Find Match 按鈕應該可以點擊', async () => {
      wrapper = mount(GameLobby)
      await wrapper.vm.$nextTick()

      const button = wrapper.find('[data-testid="find-match-button"]')
      expect(button.attributes('disabled')).toBeUndefined()
    })

    it('不應該顯示配對中的提示', async () => {
      wrapper = mount(GameLobby)
      await wrapper.vm.$nextTick()

      const findingIndicator = wrapper.find('[data-testid="finding-indicator"]')
      expect(findingIndicator.exists()).toBe(false)
    })

    it('不應該顯示錯誤訊息', async () => {
      wrapper = mount(GameLobby)
      await wrapper.vm.$nextTick()

      const errorMessage = wrapper.find('[data-testid="error-message"]')
      expect(errorMessage.exists()).toBe(false)
    })

    it('不應該顯示倒數計時器', async () => {
      wrapper = mount(GameLobby)
      await wrapper.vm.$nextTick()

      const countdown = wrapper.find('[data-testid="matchmaking-countdown"]')
      expect(countdown.exists()).toBe(false)
    })
  })

  describe('配對中狀態（finding）', () => {
    it('點擊 Find Match 後應該更新狀態為 finding', async () => {
      wrapper = mount(GameLobby)
      await wrapper.vm.$nextTick()

      const store = useMatchmakingStateStore()
      const button = wrapper.find('[data-testid="find-match-button"]')

      await button.trigger('click')
      await wrapper.vm.$nextTick()

      expect(store.status).toBe('finding')
    })

    it('配對中應該顯示 Finding Match... 提示', async () => {
      const store = useMatchmakingStateStore()
      store.setStatus('finding')

      wrapper = mount(GameLobby)
      await wrapper.vm.$nextTick()

      const findingIndicator = wrapper.find('[data-testid="finding-indicator"]')
      expect(findingIndicator.exists()).toBe(true)
      expect(findingIndicator.text()).toContain('Finding Match')
    })

    it('配對中應該禁用 Find Match 按鈕', async () => {
      const store = useMatchmakingStateStore()
      store.setStatus('finding')

      wrapper = mount(GameLobby)
      await wrapper.vm.$nextTick()

      const button = wrapper.find('[data-testid="find-match-button"]')
      expect(button.attributes('disabled')).toBeDefined()
    })

    it('配對中應該顯示倒數計時器（初始 30 秒）', async () => {
      const store = useMatchmakingStateStore()
      store.setStatus('finding')

      wrapper = mount(GameLobby)
      await wrapper.vm.$nextTick()

      const countdown = wrapper.find('[data-testid="matchmaking-countdown"]')
      expect(countdown.exists()).toBe(true)
      expect(countdown.text()).toContain('30')
    })

    it('倒數計時器應該每秒遞減', async () => {
      const store = useMatchmakingStateStore()
      store.setStatus('finding')

      wrapper = mount(GameLobby)
      await wrapper.vm.$nextTick()

      const countdown = wrapper.find('[data-testid="matchmaking-countdown"]')
      expect(countdown.text()).toContain('30')

      // 推進 1 秒
      vi.advanceTimersByTime(1000)
      await wrapper.vm.$nextTick()

      expect(countdown.text()).toContain('29')

      // 推進 5 秒
      vi.advanceTimersByTime(5000)
      await wrapper.vm.$nextTick()

      expect(countdown.text()).toContain('24')
    })

    it('倒數結束後應該顯示錯誤狀態', async () => {
      const store = useMatchmakingStateStore()
      store.setStatus('finding')

      wrapper = mount(GameLobby)
      await wrapper.vm.$nextTick()

      // 推進 30 秒
      vi.advanceTimersByTime(30000)
      await wrapper.vm.$nextTick()

      expect(store.status).toBe('error')
      expect(store.errorMessage).toContain('timeout')
    })

    it('配對中不應該顯示錯誤訊息', async () => {
      const store = useMatchmakingStateStore()
      store.setStatus('finding')

      wrapper = mount(GameLobby)
      await wrapper.vm.$nextTick()

      const errorMessage = wrapper.find('[data-testid="error-message"]')
      expect(errorMessage.exists()).toBe(false)
    })
  })

  describe('錯誤狀態（error）', () => {
    it('應該顯示錯誤訊息', async () => {
      const store = useMatchmakingStateStore()
      store.setStatus('error')
      store.setErrorMessage('配對超時，請重試')

      wrapper = mount(GameLobby)
      await wrapper.vm.$nextTick()

      const errorMessage = wrapper.find('[data-testid="error-message"]')
      expect(errorMessage.exists()).toBe(true)
      expect(errorMessage.text()).toContain('配對超時，請重試')
    })

    it('應該顯示重試按鈕', async () => {
      const store = useMatchmakingStateStore()
      store.setStatus('error')
      store.setErrorMessage('配對失敗')

      wrapper = mount(GameLobby)
      await wrapper.vm.$nextTick()

      const retryButton = wrapper.find('[data-testid="retry-button"]')
      expect(retryButton.exists()).toBe(true)
      expect(retryButton.text()).toContain('Retry')
    })

    it('點擊重試按鈕應該清除錯誤並返回 idle 狀態', async () => {
      const store = useMatchmakingStateStore()
      store.setStatus('error')
      store.setErrorMessage('配對失敗')

      wrapper = mount(GameLobby)
      await wrapper.vm.$nextTick()

      const retryButton = wrapper.find('[data-testid="retry-button"]')
      await retryButton.trigger('click')
      await wrapper.vm.$nextTick()

      expect(store.status).toBe('idle')
      expect(store.errorMessage).toBeNull()
    })

    it('錯誤狀態不應該顯示配對中提示', async () => {
      const store = useMatchmakingStateStore()
      store.setStatus('error')
      store.setErrorMessage('錯誤')

      wrapper = mount(GameLobby)
      await wrapper.vm.$nextTick()

      const findingIndicator = wrapper.find('[data-testid="finding-indicator"]')
      expect(findingIndicator.exists()).toBe(false)
    })

    it('錯誤狀態不應該顯示倒數計時器', async () => {
      const store = useMatchmakingStateStore()
      store.setStatus('error')
      store.setErrorMessage('錯誤')

      wrapper = mount(GameLobby)
      await wrapper.vm.$nextTick()

      const countdown = wrapper.find('[data-testid="matchmaking-countdown"]')
      expect(countdown.exists()).toBe(false)
    })

    it('錯誤狀態應該禁用 Find Match 按鈕', async () => {
      const store = useMatchmakingStateStore()
      store.setStatus('error')

      wrapper = mount(GameLobby)
      await wrapper.vm.$nextTick()

      const button = wrapper.find('[data-testid="find-match-button"]')
      expect(button.attributes('disabled')).toBeDefined()
    })
  })

  describe('倒數計時器功能', () => {
    it('倒數低於 10 秒時應該有警示樣式', async () => {
      const store = useMatchmakingStateStore()
      store.setStatus('finding')

      wrapper = mount(GameLobby)
      await wrapper.vm.$nextTick()

      // 推進 21 秒（剩餘 9 秒）
      vi.advanceTimersByTime(21000)
      await wrapper.vm.$nextTick()

      const countdown = wrapper.find('[data-testid="matchmaking-countdown"]')
      expect(countdown.classes()).toContain('warning')
    })

    it('組件卸載時應該清除計時器', async () => {
      const store = useMatchmakingStateStore()
      store.setStatus('finding')

      wrapper = mount(GameLobby)
      await wrapper.vm.$nextTick()

      // 卸載組件
      wrapper.unmount()

      // 推進時間（計時器應該不再觸發）
      const currentStatus = store.status
      vi.advanceTimersByTime(35000)

      // 狀態不應該改變（因為計時器已清除）
      expect(store.status).toBe(currentStatus)
    })

    it('收到 GameStarted 事件後應該停止倒數', async () => {
      const store = useMatchmakingStateStore()
      store.setStatus('finding')

      wrapper = mount(GameLobby)
      await wrapper.vm.$nextTick()

      // 模擬收到 GameStarted 事件（通過清除會話）
      store.clearSession()
      await wrapper.vm.$nextTick()

      const countdown = wrapper.find('[data-testid="matchmaking-countdown"]')
      expect(countdown.exists()).toBe(false)
    })
  })

  describe('狀態轉換', () => {
    it('應該正確處理 idle -> finding -> idle 轉換', async () => {
      const store = useMatchmakingStateStore()
      wrapper = mount(GameLobby)
      await wrapper.vm.$nextTick()

      // idle 狀態
      expect(store.status).toBe('idle')
      let button = wrapper.find('[data-testid="find-match-button"]')
      expect(button.attributes('disabled')).toBeUndefined()

      // 點擊開始配對
      await button.trigger('click')
      await wrapper.vm.$nextTick()

      // finding 狀態
      expect(store.status).toBe('finding')
      button = wrapper.find('[data-testid="find-match-button"]')
      expect(button.attributes('disabled')).toBeDefined()

      // 模擬遊戲開始
      store.clearSession()
      await wrapper.vm.$nextTick()

      // 返回 idle 狀態
      expect(store.status).toBe('idle')
    })

    it('應該正確處理 finding -> error -> idle 轉換', async () => {
      const store = useMatchmakingStateStore()
      store.setStatus('finding')

      wrapper = mount(GameLobby)
      await wrapper.vm.$nextTick()

      // finding 狀態
      expect(store.status).toBe('finding')

      // 推進 30 秒觸發超時
      vi.advanceTimersByTime(30000)
      await wrapper.vm.$nextTick()

      // error 狀態
      expect(store.status).toBe('error')
      const retryButton = wrapper.find('[data-testid="retry-button"]')
      expect(retryButton.exists()).toBe(true)

      // 點擊重試
      await retryButton.trigger('click')
      await wrapper.vm.$nextTick()

      // 返回 idle 狀態
      expect(store.status).toBe('idle')
    })
  })

  describe('可訪問性（Accessibility）', () => {
    it('Find Match 按鈕應該有適當的 ARIA 標籤', async () => {
      wrapper = mount(GameLobby)
      await wrapper.vm.$nextTick()

      const button = wrapper.find('[data-testid="find-match-button"]')
      expect(button.attributes('aria-label')).toBeDefined()
    })

    it('倒數計時器應該有 ARIA live region', async () => {
      const store = useMatchmakingStateStore()
      store.setStatus('finding')

      wrapper = mount(GameLobby)
      await wrapper.vm.$nextTick()

      const countdown = wrapper.find('[data-testid="matchmaking-countdown"]')
      expect(countdown.attributes('aria-live')).toBe('polite')
    })

    it('錯誤訊息應該有 role="alert"', async () => {
      const store = useMatchmakingStateStore()
      store.setStatus('error')
      store.setErrorMessage('錯誤')

      wrapper = mount(GameLobby)
      await wrapper.vm.$nextTick()

      const errorMessage = wrapper.find('[data-testid="error-message"]')
      expect(errorMessage.attributes('role')).toBe('alert')
    })
  })

  describe('Action Panel 整合', () => {
    // Helper function to find elements in document (for Teleport)
    const findInDocument = (selector: string): Element | null => {
      return document.querySelector(selector)
    }

    beforeEach(() => {
      // 清理 DOM
      document.body.innerHTML = ''
    })

    afterEach(() => {
      // 清理 DOM
      document.body.innerHTML = ''
    })

    it('應該顯示選單按鈕', async () => {
      wrapper = mount(GameLobby, {
        attachTo: document.body,
      })
      await wrapper.vm.$nextTick()

      const menuButton = wrapper.find('[data-testid="menu-button"]')
      expect(menuButton.exists()).toBe(true)
    })

    it('初始狀態 ActionPanel 應該是關閉的', async () => {
      wrapper = mount(GameLobby, {
        attachTo: document.body,
      })
      await wrapper.vm.$nextTick()

      const panel = findInDocument('[data-testid="action-panel"]')
      expect(panel).toBeNull()
    })

    it('點擊選單按鈕應該開啟 ActionPanel', async () => {
      wrapper = mount(GameLobby, {
        attachTo: document.body,
      })
      await wrapper.vm.$nextTick()

      const menuButton = wrapper.find('[data-testid="menu-button"]')
      await menuButton.trigger('click')
      await wrapper.vm.$nextTick()

      const panel = findInDocument('[data-testid="action-panel"]')
      expect(panel).not.toBeNull()
    })

    it('ActionPanel 應該顯示 Back to Home 選項', async () => {
      wrapper = mount(GameLobby, {
        attachTo: document.body,
      })
      await wrapper.vm.$nextTick()

      // 開啟面板
      const menuButton = wrapper.find('[data-testid="menu-button"]')
      await menuButton.trigger('click')
      await wrapper.vm.$nextTick()

      // 檢查選單項目
      const menuItems = Array.from(document.querySelectorAll('[data-testid="menu-item"]'))
      expect(menuItems).toHaveLength(1)
      expect(menuItems[0]?.textContent).toContain('Back to Home')
    })

    it('點擊 Back to Home 應該導航至首頁', async () => {
      wrapper = mount(GameLobby, {
        attachTo: document.body,
      })
      await wrapper.vm.$nextTick()

      // 開啟面板
      const menuButton = wrapper.find('[data-testid="menu-button"]')
      await menuButton.trigger('click')
      await wrapper.vm.$nextTick()

      // 點擊 Back to Home
      const menuItem = findInDocument('[data-testid="menu-item"]')
      ;(menuItem as HTMLElement)?.click()
      await wrapper.vm.$nextTick()

      // 檢查 router.push 是否被調用
      expect(mockPush).toHaveBeenCalledWith('/')
    })

    it('點擊 Back to Home 後應該關閉面板', async () => {
      wrapper = mount(GameLobby, {
        attachTo: document.body,
      })
      await wrapper.vm.$nextTick()

      // 開啟面板
      const menuButton = wrapper.find('[data-testid="menu-button"]')
      await menuButton.trigger('click')
      await wrapper.vm.$nextTick()

      // 點擊 Back to Home
      const menuItem = findInDocument('[data-testid="menu-item"]')
      ;(menuItem as HTMLElement)?.click()
      await wrapper.vm.$nextTick()

      // 等待過渡效果 (使用 fake timers)
      vi.advanceTimersByTime(300)
      await wrapper.vm.$nextTick()

      // 面板應該關閉
      const panel = findInDocument('[data-testid="action-panel"]')
      expect(panel).toBeNull()
    })

    it('點擊遮罩應該關閉面板', async () => {
      wrapper = mount(GameLobby, {
        attachTo: document.body,
      })
      await wrapper.vm.$nextTick()

      // 開啟面板
      const menuButton = wrapper.find('[data-testid="menu-button"]')
      await menuButton.trigger('click')
      await wrapper.vm.$nextTick()

      // 點擊遮罩
      const overlay = findInDocument('[data-testid="panel-overlay"]')
      ;(overlay as HTMLElement)?.click()
      await wrapper.vm.$nextTick()

      // 等待過渡效果 (使用 fake timers)
      vi.advanceTimersByTime(300)
      await wrapper.vm.$nextTick()

      // 面板應該關閉
      const panel = findInDocument('[data-testid="action-panel"]')
      expect(panel).toBeNull()
    })

    it('選單按鈕應該有適當的 ARIA 標籤', async () => {
      wrapper = mount(GameLobby, {
        attachTo: document.body,
      })
      await wrapper.vm.$nextTick()

      const menuButton = wrapper.find('[data-testid="menu-button"]')
      expect(menuButton.attributes('aria-label')).toBeDefined()
    })
  })
})
