/**
 * ConfirmDialog Component Tests
 *
 * @description
 * 測試 ConfirmDialog.vue 確認對話框組件的所有功能
 * - 對話框開關狀態
 * - 標題和訊息顯示
 * - 確認/取消按鈕
 * - 點擊遮罩關閉
 * - 過渡動畫
 * - 可訪問性
 *
 * 測試覆蓋率目標: > 80%
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import ConfirmDialog from '../../src/components/ConfirmDialog.vue'

describe('ConfirmDialog', () => {
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
    // 恢復 body overflow
    document.body.style.overflow = ''
  })

  // 輔助函數：在 document 中查找元素（支持 Teleport）
  const findInDocument = (selector: string): Element | null => {
    return document.querySelector(selector)
  }

  describe('基本渲染', () => {
    it('當 isOpen = false 時不應該顯示對話框', async () => {
      wrapper = mount(ConfirmDialog, {
        props: {
          isOpen: false,
          title: 'Test Title',
          message: 'Test Message',
        },
        attachTo: document.body,
      })

      await wrapper.vm.$nextTick()

      const dialog = findInDocument('[data-testid="confirm-dialog"]')
      expect(dialog).toBeNull()
    })

    it('當 isOpen = true 時應該顯示對話框', async () => {
      wrapper = mount(ConfirmDialog, {
        props: {
          isOpen: true,
          title: 'Test Title',
          message: 'Test Message',
        },
        attachTo: document.body,
      })

      await wrapper.vm.$nextTick()

      const dialog = findInDocument('[data-testid="confirm-dialog"]')
      expect(dialog).not.toBeNull()
    })

    it('應該顯示遮罩背景', async () => {
      wrapper = mount(ConfirmDialog, {
        props: {
          isOpen: true,
          title: 'Test Title',
          message: 'Test Message',
        },
        attachTo: document.body,
      })

      await wrapper.vm.$nextTick()

      const overlay = findInDocument('[data-testid="confirm-dialog-overlay"]')
      expect(overlay).not.toBeNull()
    })

    it('應該正確顯示標題', async () => {
      const title = 'Confirm Action'

      wrapper = mount(ConfirmDialog, {
        props: {
          isOpen: true,
          title,
          message: 'Test Message',
        },
        attachTo: document.body,
      })

      await wrapper.vm.$nextTick()

      const titleElement = findInDocument('[data-testid="dialog-title"]')
      expect(titleElement?.textContent).toContain(title)
    })

    it('應該正確顯示訊息', async () => {
      const message = 'Are you sure you want to proceed?'

      wrapper = mount(ConfirmDialog, {
        props: {
          isOpen: true,
          title: 'Test Title',
          message,
        },
        attachTo: document.body,
      })

      await wrapper.vm.$nextTick()

      const messageElement = findInDocument('[data-testid="dialog-message"]')
      expect(messageElement?.textContent).toContain(message)
    })

    it('應該顯示預設的按鈕文字', async () => {
      wrapper = mount(ConfirmDialog, {
        props: {
          isOpen: true,
          title: 'Test Title',
          message: 'Test Message',
        },
        attachTo: document.body,
      })

      await wrapper.vm.$nextTick()

      const confirmButton = findInDocument('[data-testid="confirm-button"]')
      const cancelButton = findInDocument('[data-testid="cancel-button"]')

      expect(confirmButton?.textContent).toContain('確認')
      expect(cancelButton?.textContent).toContain('取消')
    })

    it('應該顯示自訂的按鈕文字', async () => {
      wrapper = mount(ConfirmDialog, {
        props: {
          isOpen: true,
          title: 'Test Title',
          message: 'Test Message',
          confirmText: 'Yes',
          cancelText: 'No',
        },
        attachTo: document.body,
      })

      await wrapper.vm.$nextTick()

      const confirmButton = findInDocument('[data-testid="confirm-button"]')
      const cancelButton = findInDocument('[data-testid="cancel-button"]')

      expect(confirmButton?.textContent).toContain('Yes')
      expect(cancelButton?.textContent).toContain('No')
    })
  })

  describe('使用者互動', () => {
    it('點擊確認按鈕應該觸發 confirm 事件', async () => {
      wrapper = mount(ConfirmDialog, {
        props: {
          isOpen: true,
          title: 'Test Title',
          message: 'Test Message',
        },
        attachTo: document.body,
      })

      await wrapper.vm.$nextTick()

      const confirmButton = findInDocument('[data-testid="confirm-button"]')
      ;(confirmButton as HTMLElement)?.click()
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('confirm')).toBeTruthy()
      expect(wrapper.emitted('confirm')).toHaveLength(1)
    })

    it('點擊取消按鈕應該觸發 cancel 事件', async () => {
      wrapper = mount(ConfirmDialog, {
        props: {
          isOpen: true,
          title: 'Test Title',
          message: 'Test Message',
        },
        attachTo: document.body,
      })

      await wrapper.vm.$nextTick()

      const cancelButton = findInDocument('[data-testid="cancel-button"]')
      ;(cancelButton as HTMLElement)?.click()
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('cancel')).toBeTruthy()
      expect(wrapper.emitted('cancel')).toHaveLength(1)
    })

    it('點擊遮罩應該觸發 cancel 事件', async () => {
      wrapper = mount(ConfirmDialog, {
        props: {
          isOpen: true,
          title: 'Test Title',
          message: 'Test Message',
        },
        attachTo: document.body,
      })

      await wrapper.vm.$nextTick()

      // 找到遮罩（不是 overlay 本身，而是它的子元素）
      const overlay = document.querySelector(
        '[data-testid="confirm-dialog-overlay"] > div'
      )
      ;(overlay as HTMLElement)?.click()
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('cancel')).toBeTruthy()
      expect(wrapper.emitted('cancel')).toHaveLength(1)
    })
  })

  describe('背景滾動控制', () => {
    it('開啟對話框時應該禁止背景滾動', async () => {
      wrapper = mount(ConfirmDialog, {
        props: {
          isOpen: false,
          title: 'Test Title',
          message: 'Test Message',
        },
        attachTo: document.body,
      })

      await wrapper.vm.$nextTick()
      // 等待 watch 執行
      await new Promise(resolve => setTimeout(resolve, 10))
      expect(document.body.style.overflow).toBe('')

      await wrapper.setProps({ isOpen: true })
      await wrapper.vm.$nextTick()
      // 等待 watch 執行
      await new Promise(resolve => setTimeout(resolve, 10))
      expect(document.body.style.overflow).toBe('hidden')
    })

    it('關閉對話框時應該恢復背景滾動', async () => {
      wrapper = mount(ConfirmDialog, {
        props: {
          isOpen: true,
          title: 'Test Title',
          message: 'Test Message',
        },
        attachTo: document.body,
      })

      await wrapper.vm.$nextTick()
      // 等待 watch 執行
      await new Promise(resolve => setTimeout(resolve, 10))
      expect(document.body.style.overflow).toBe('hidden')

      await wrapper.setProps({ isOpen: false })
      await wrapper.vm.$nextTick()
      // 等待 watch 執行
      await new Promise(resolve => setTimeout(resolve, 10))
      expect(document.body.style.overflow).toBe('')
    })
  })

  describe('可訪問性（Accessibility）', () => {
    it('對話框應該有適當的 ARIA role', async () => {
      wrapper = mount(ConfirmDialog, {
        props: {
          isOpen: true,
          title: 'Test Title',
          message: 'Test Message',
        },
        attachTo: document.body,
      })

      await wrapper.vm.$nextTick()

      const dialog = findInDocument('[data-testid="confirm-dialog"]')
      expect(dialog?.getAttribute('role')).toBe('dialog')
    })

    it('對話框應該有 aria-modal 屬性', async () => {
      wrapper = mount(ConfirmDialog, {
        props: {
          isOpen: true,
          title: 'Test Title',
          message: 'Test Message',
        },
        attachTo: document.body,
      })

      await wrapper.vm.$nextTick()

      const dialog = findInDocument('[data-testid="confirm-dialog"]')
      expect(dialog?.getAttribute('aria-modal')).toBe('true')
    })

    it('對話框應該有 aria-labelledby 屬性', async () => {
      const title = 'Test Title'

      wrapper = mount(ConfirmDialog, {
        props: {
          isOpen: true,
          title,
          message: 'Test Message',
        },
        attachTo: document.body,
      })

      await wrapper.vm.$nextTick()

      const dialog = findInDocument('[data-testid="confirm-dialog"]')
      expect(dialog?.getAttribute('aria-labelledby')).toBe(title)
    })

    it('按鈕應該是可聚焦的', async () => {
      wrapper = mount(ConfirmDialog, {
        props: {
          isOpen: true,
          title: 'Test Title',
          message: 'Test Message',
        },
        attachTo: document.body,
      })

      await wrapper.vm.$nextTick()

      const confirmButton = findInDocument('[data-testid="confirm-button"]')
      const cancelButton = findInDocument('[data-testid="cancel-button"]')

      expect(confirmButton?.tagName).toBe('BUTTON')
      expect(cancelButton?.tagName).toBe('BUTTON')
    })
  })

  describe('邊界情況', () => {
    it('應該處理 isOpen 的快速切換', async () => {
      wrapper = mount(ConfirmDialog, {
        props: {
          isOpen: false,
          title: 'Test Title',
          message: 'Test Message',
        },
        attachTo: document.body,
      })

      await wrapper.vm.$nextTick()

      let dialog = findInDocument('[data-testid="confirm-dialog"]')
      expect(dialog).toBeNull()

      await wrapper.setProps({ isOpen: true })
      await wrapper.vm.$nextTick()
      dialog = findInDocument('[data-testid="confirm-dialog"]')
      expect(dialog).not.toBeNull()

      await wrapper.setProps({ isOpen: false })
      await wrapper.vm.$nextTick()
      dialog = findInDocument('[data-testid="confirm-dialog"]')
      expect(dialog).toBeNull()
    })

    it('應該處理空字串的標題', async () => {
      wrapper = mount(ConfirmDialog, {
        props: {
          isOpen: true,
          title: '',
          message: 'Test Message',
        },
        attachTo: document.body,
      })

      await wrapper.vm.$nextTick()

      const dialog = findInDocument('[data-testid="confirm-dialog"]')
      expect(dialog).not.toBeNull()
    })

    it('應該處理長文字的訊息', async () => {
      const longMessage = 'A'.repeat(1000)

      wrapper = mount(ConfirmDialog, {
        props: {
          isOpen: true,
          title: 'Test Title',
          message: longMessage,
        },
        attachTo: document.body,
      })

      await wrapper.vm.$nextTick()

      const messageElement = findInDocument('[data-testid="dialog-message"]')
      expect(messageElement?.textContent).toContain(longMessage)
    })
  })
})
