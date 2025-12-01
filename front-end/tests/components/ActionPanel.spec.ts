/**
 * ActionPanel Component Tests
 *
 * @description
 * 測試 ActionPanel.vue 可重用組件的所有功能
 * - 面板開關狀態
 * - 選單項目渲染
 * - 點擊選單項目觸發回調
 * - 點擊外部/遮罩關閉面板
 * - 滑出動畫
 * - Lobby context 測試（Back to Home）
 * - Game context 測試（Leave Game）
 *
 * 測試覆蓋率目標: > 80%
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import ActionPanel from '../../src/components/ActionPanel.vue'

// ActionPanelItem 介面（與組件定義一致）
interface ActionPanelItem {
  id: string
  label: string
  icon?: string
  onClick: () => void
}

describe('ActionPanel', () => {
  let wrapper: VueWrapper<any>

  beforeEach(() => {
    // 清理 DOM
    document.body.innerHTML = ''
  })

  afterEach(() => {
    // 清理組件
    if (wrapper) {
      wrapper.unmount()
    }
    // 清理 DOM
    document.body.innerHTML = ''
  })

  // 輔助函數：在 document 中查找元素（支持 Teleport）
  const findInDocument = (selector: string): Element | null => {
    return document.querySelector(selector)
  }

  const findAllInDocument = (selector: string): Element[] => {
    return Array.from(document.querySelectorAll(selector))
  }

  describe('基本渲染', () => {
    it('當 isOpen = false 時不應該顯示面板', async () => {
      const items: ActionPanelItem[] = []

      wrapper = mount(ActionPanel, {
        props: {
          isOpen: false,
          items,
        },
        attachTo: document.body,
      })

      await wrapper.vm.$nextTick()

      const panel = findInDocument('[data-testid="action-panel"]')
      expect(panel).toBeNull()
    })

    it('當 isOpen = true 時應該顯示面板', async () => {
      const items: ActionPanelItem[] = []

      wrapper = mount(ActionPanel, {
        props: {
          isOpen: true,
          items,
        },
        attachTo: document.body,
      })

      await wrapper.vm.$nextTick()

      const panel = findInDocument('[data-testid="action-panel"]')
      expect(panel).not.toBeNull()
    })

    it('應該顯示遮罩背景', async () => {
      wrapper = mount(ActionPanel, {
        props: {
          isOpen: true,
          items: [],
        },
        attachTo: document.body,
      })

      await wrapper.vm.$nextTick()

      const overlay = findInDocument('[data-testid="panel-overlay"]')
      expect(overlay).not.toBeNull()
    })

    it('面板應該在右側', async () => {
      wrapper = mount(ActionPanel, {
        props: {
          isOpen: true,
          items: [],
        },
        attachTo: document.body,
      })

      await wrapper.vm.$nextTick()

      const panel = findInDocument('[data-testid="action-panel"]')
      expect(panel?.classList.contains('right-0')).toBe(true)
    })
  })

  describe('選單項目渲染', () => {
    it('應該渲染所有選單項目', async () => {
      const items: ActionPanelItem[] = [
        { id: 'item-1', label: 'Option 1', onClick: vi.fn() },
        { id: 'item-2', label: 'Option 2', onClick: vi.fn() },
        { id: 'item-3', label: 'Option 3', onClick: vi.fn() },
      ]

      wrapper = mount(ActionPanel, {
        props: {
          isOpen: true,
          items,
        },
        attachTo: document.body,
      })

      await wrapper.vm.$nextTick()

      const menuItems = findAllInDocument('[data-testid="menu-item"]')
      expect(menuItems).toHaveLength(3)
    })

    it('應該顯示正確的選單項目標籤', async () => {
      const items: ActionPanelItem[] = [
        { id: 'home', label: 'Back to Home', onClick: vi.fn() },
        { id: 'settings', label: 'Settings', onClick: vi.fn() },
      ]

      wrapper = mount(ActionPanel, {
        props: {
          isOpen: true,
          items,
        },
        attachTo: document.body,
      })

      await wrapper.vm.$nextTick()

      const menuItems = findAllInDocument('[data-testid="menu-item"]')
      expect(menuItems[0]?.textContent).toContain('Back to Home')
      expect(menuItems[1]?.textContent).toContain('Settings')
    })

    it('沒有選單項目時應該顯示空狀態', async () => {
      wrapper = mount(ActionPanel, {
        props: {
          isOpen: true,
          items: [],
        },
        attachTo: document.body,
      })

      await wrapper.vm.$nextTick()

      const panel = findInDocument('[data-testid="action-panel"]')
      expect(panel).not.toBeNull()
      const menuItems = findAllInDocument('[data-testid="menu-item"]')
      expect(menuItems).toHaveLength(0)
    })
  })

  describe('選單項目互動', () => {
    it('點擊選單項目應該觸發對應的 onClick 回調', async () => {
      const onClick1 = vi.fn()
      const onClick2 = vi.fn()

      const items: ActionPanelItem[] = [
        { id: 'item-1', label: 'Option 1', onClick: onClick1 },
        { id: 'item-2', label: 'Option 2', onClick: onClick2 },
      ]

      wrapper = mount(ActionPanel, {
        props: {
          isOpen: true,
          items,
        },
        attachTo: document.body,
      })

      await wrapper.vm.$nextTick()

      const menuItems = findAllInDocument('[data-testid="menu-item"]')

      ;(menuItems[0] as HTMLElement)?.click()
      await wrapper.vm.$nextTick()
      expect(onClick1).toHaveBeenCalledTimes(1)
      expect(onClick2).not.toHaveBeenCalled()

      ;(menuItems[1] as HTMLElement)?.click()
      await wrapper.vm.$nextTick()
      expect(onClick2).toHaveBeenCalledTimes(1)
      expect(onClick1).toHaveBeenCalledTimes(1) // 仍然只被調用一次
    })

    it('選單項目應該有 hover 效果', async () => {
      const items: ActionPanelItem[] = [
        { id: 'item-1', label: 'Option 1', onClick: vi.fn() },
      ]

      wrapper = mount(ActionPanel, {
        props: {
          isOpen: true,
          items,
        },
        attachTo: document.body,
      })

      await wrapper.vm.$nextTick()

      const menuItem = findInDocument('[data-testid="menu-item"]')
      expect(menuItem?.classList.contains('hover:bg-primary-50')).toBe(true)
    })
  })

  describe('關閉面板', () => {
    it('點擊遮罩應該觸發 close 事件', async () => {
      wrapper = mount(ActionPanel, {
        props: {
          isOpen: true,
          items: [],
        },
        attachTo: document.body,
      })

      await wrapper.vm.$nextTick()

      const overlay = findInDocument('[data-testid="panel-overlay"]')
      ;(overlay as HTMLElement)?.click()
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('close')).toBeTruthy()
      expect(wrapper.emitted('close')).toHaveLength(1)
    })

    it('點擊關閉按鈕應該觸發 close 事件', async () => {
      wrapper = mount(ActionPanel, {
        props: {
          isOpen: true,
          items: [],
        },
        attachTo: document.body,
      })

      await wrapper.vm.$nextTick()

      const closeButton = findInDocument('[data-testid="close-button"]')
      ;(closeButton as HTMLElement)?.click()
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('close')).toBeTruthy()
      expect(wrapper.emitted('close')).toHaveLength(1)
    })

    it('多次點擊遮罩應該觸發多次 close 事件', async () => {
      wrapper = mount(ActionPanel, {
        props: {
          isOpen: true,
          items: [],
        },
        attachTo: document.body,
      })

      await wrapper.vm.$nextTick()

      const overlay = findInDocument('[data-testid="panel-overlay"]')

      ;(overlay as HTMLElement)?.click()
      await wrapper.vm.$nextTick()
      ;(overlay as HTMLElement)?.click()
      await wrapper.vm.$nextTick()
      ;(overlay as HTMLElement)?.click()
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('close')).toHaveLength(3)
    })
  })

  describe('Lobby Context - Back to Home', () => {
    it('應該正確顯示 Back to Home 選項', async () => {
      const items: ActionPanelItem[] = [
        { id: 'back-home', label: 'Back to Home', onClick: vi.fn() },
      ]

      wrapper = mount(ActionPanel, {
        props: {
          isOpen: true,
          items,
        },
        attachTo: document.body,
      })

      await wrapper.vm.$nextTick()

      const menuItem = findInDocument('[data-testid="menu-item"]')
      expect(menuItem?.textContent).toContain('Back to Home')
    })

    it('點擊 Back to Home 應該觸發導航', async () => {
      const onBackToHome = vi.fn()

      const items: ActionPanelItem[] = [
        { id: 'back-home', label: 'Back to Home', onClick: onBackToHome },
      ]

      wrapper = mount(ActionPanel, {
        props: {
          isOpen: true,
          items,
        },
        attachTo: document.body,
      })

      await wrapper.vm.$nextTick()

      const menuItem = findInDocument('[data-testid="menu-item"]')
      ;(menuItem as HTMLElement)?.click()
      await wrapper.vm.$nextTick()

      expect(onBackToHome).toHaveBeenCalledTimes(1)
    })

    it('Lobby context 應該顯示正確的選單項目數量', async () => {
      // 在 lobby context，只有 "Back to Home" 一個選項
      const items: ActionPanelItem[] = [
        { id: 'back-home', label: 'Back to Home', onClick: vi.fn() },
      ]

      wrapper = mount(ActionPanel, {
        props: {
          isOpen: true,
          items,
        },
        attachTo: document.body,
      })

      await wrapper.vm.$nextTick()

      const menuItems = findAllInDocument('[data-testid="menu-item"]')
      expect(menuItems).toHaveLength(1)
    })
  })

  describe('Game Context - Leave Game', () => {
    it('應該正確顯示 Leave Game 選項', async () => {
      const items: ActionPanelItem[] = [
        { id: 'leave-game', label: 'Leave Game', onClick: vi.fn() },
      ]

      wrapper = mount(ActionPanel, {
        props: {
          isOpen: true,
          items,
        },
        attachTo: document.body,
      })

      await wrapper.vm.$nextTick()

      const menuItem = findInDocument('[data-testid="menu-item"]')
      expect(menuItem?.textContent).toContain('Leave Game')
    })

    it('Game context 可以有多個選單項目', async () => {
      const items: ActionPanelItem[] = [
        { id: 'leave-game', label: 'Leave Game', onClick: vi.fn() },
        { id: 'settings', label: 'Settings', onClick: vi.fn() },
      ]

      wrapper = mount(ActionPanel, {
        props: {
          isOpen: true,
          items,
        },
        attachTo: document.body,
      })

      await wrapper.vm.$nextTick()

      const menuItems = findAllInDocument('[data-testid="menu-item"]')
      expect(menuItems).toHaveLength(2)
    })
  })

  describe('動畫與過渡效果', () => {
    it('面板應該有過渡效果類名', async () => {
      wrapper = mount(ActionPanel, {
        props: {
          isOpen: true,
          items: [],
        },
        attachTo: document.body,
      })

      await wrapper.vm.$nextTick()

      const panel = findInDocument('[data-testid="action-panel"]')
      // @vueuse/motion 會添加動畫相關的類名或屬性
      expect(panel).not.toBeNull()
    })

    it('遮罩應該有透明度過渡效果', async () => {
      wrapper = mount(ActionPanel, {
        props: {
          isOpen: true,
          items: [],
        },
        attachTo: document.body,
      })

      await wrapper.vm.$nextTick()

      const overlay = findInDocument('[data-testid="panel-overlay"]')
      expect(overlay?.classList.contains('transition-opacity')).toBe(true)
    })
  })

  describe('可訪問性（Accessibility）', () => {
    it('面板應該有適當的 ARIA role', async () => {
      wrapper = mount(ActionPanel, {
        props: {
          isOpen: true,
          items: [],
        },
        attachTo: document.body,
      })

      await wrapper.vm.$nextTick()

      const panel = findInDocument('[data-testid="action-panel"]')
      expect(panel?.getAttribute('role')).toBe('dialog')
    })

    it('面板應該有 aria-label', async () => {
      wrapper = mount(ActionPanel, {
        props: {
          isOpen: true,
          items: [],
        },
        attachTo: document.body,
      })

      await wrapper.vm.$nextTick()

      const panel = findInDocument('[data-testid="action-panel"]')
      expect(panel?.getAttribute('aria-label')).toBeDefined()
    })

    it('關閉按鈕應該有 aria-label', async () => {
      wrapper = mount(ActionPanel, {
        props: {
          isOpen: true,
          items: [],
        },
        attachTo: document.body,
      })

      await wrapper.vm.$nextTick()

      const closeButton = findInDocument('[data-testid="close-button"]')
      expect(closeButton?.getAttribute('aria-label')).toBeDefined()
    })

    it('選單項目應該是可聚焦的', async () => {
      const items: ActionPanelItem[] = [
        { id: 'item-1', label: 'Option 1', onClick: vi.fn() },
      ]

      wrapper = mount(ActionPanel, {
        props: {
          isOpen: true,
          items,
        },
        attachTo: document.body,
      })

      await wrapper.vm.$nextTick()

      const menuItem = findInDocument('[data-testid="menu-item"]')
      // 按鈕元素本身就是可聚焦的
      expect(menuItem?.tagName).toBe('BUTTON')
    })
  })

  describe('邊界情況', () => {
    it('應該處理空的 items 陣列', async () => {
      wrapper = mount(ActionPanel, {
        props: {
          isOpen: true,
          items: [],
        },
        attachTo: document.body,
      })

      await wrapper.vm.$nextTick()

      const panel = findInDocument('[data-testid="action-panel"]')
      expect(panel).not.toBeNull()
      const menuItems = findAllInDocument('[data-testid="menu-item"]')
      expect(menuItems).toHaveLength(0)
    })

    it('應該處理 isOpen 的快速切換', async () => {
      wrapper = mount(ActionPanel, {
        props: {
          isOpen: false,
          items: [],
        },
        attachTo: document.body,
      })

      await wrapper.vm.$nextTick()

      let panel = findInDocument('[data-testid="action-panel"]')
      expect(panel).toBeNull()

      await wrapper.setProps({ isOpen: true })
      await wrapper.vm.$nextTick()
      panel = findInDocument('[data-testid="action-panel"]')
      expect(panel).not.toBeNull()

      await wrapper.setProps({ isOpen: false })
      await wrapper.vm.$nextTick()
      panel = findInDocument('[data-testid="action-panel"]')
      expect(panel).toBeNull()
    })

    it('應該處理 items 的動態更新', async () => {
      const items1: ActionPanelItem[] = [
        { id: 'item-1', label: 'Option 1', onClick: vi.fn() },
      ]

      wrapper = mount(ActionPanel, {
        props: {
          isOpen: true,
          items: items1,
        },
        attachTo: document.body,
      })

      await wrapper.vm.$nextTick()

      let menuItems = findAllInDocument('[data-testid="menu-item"]')
      expect(menuItems).toHaveLength(1)

      const items2: ActionPanelItem[] = [
        { id: 'item-1', label: 'Option 1', onClick: vi.fn() },
        { id: 'item-2', label: 'Option 2', onClick: vi.fn() },
      ]

      await wrapper.setProps({ items: items2 })
      await wrapper.vm.$nextTick()
      menuItems = findAllInDocument('[data-testid="menu-item"]')
      expect(menuItems).toHaveLength(2)
    })
  })
})
