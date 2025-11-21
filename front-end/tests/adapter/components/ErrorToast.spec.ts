/**
 * ErrorToast Component Tests
 *
 * @description
 * 測試錯誤提示 Toast 組件的顯示邏輯和互動
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import ErrorToast from '../../../src/views/GamePage/components/ErrorToast.vue'
import { useUIStateStore } from '../../../src/user-interface/adapter/stores/uiState'

describe('ErrorToast', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should not be visible when no error message', () => {
    const uiStore = useUIStateStore()
    uiStore.errorMessage = null

    const wrapper = mount(ErrorToast)

    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('should be visible when error message is set', () => {
    const uiStore = useUIStateStore()
    uiStore.errorMessage = 'Network error occurred'

    const wrapper = mount(ErrorToast)

    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Network error occurred')
  })

  it('should close when close button is clicked', async () => {
    const uiStore = useUIStateStore()
    uiStore.errorMessage = 'Test error'

    const wrapper = mount(ErrorToast)

    expect(wrapper.find('[role="alert"]').exists()).toBe(true)

    const closeButton = wrapper.find('button[aria-label="Close error message"]')
    await closeButton.trigger('click')

    expect(uiStore.errorMessage).toBeNull()
  })

  it('should auto-close after 5 seconds', async () => {
    const uiStore = useUIStateStore()

    const wrapper = mount(ErrorToast)

    // Set error message after mount so watch triggers
    uiStore.errorMessage = 'Auto-close test'
    await wrapper.vm.$nextTick()

    expect(uiStore.errorMessage).toBe('Auto-close test')

    // Advance time by 5 seconds
    vi.advanceTimersByTime(5000)

    expect(uiStore.errorMessage).toBeNull()
  })

  it('should reset timer when new error appears', async () => {
    const uiStore = useUIStateStore()

    const wrapper = mount(ErrorToast)

    // Set first error after mount
    uiStore.errorMessage = 'First error'
    await wrapper.vm.$nextTick()

    // Advance time by 3 seconds
    vi.advanceTimersByTime(3000)
    expect(uiStore.errorMessage).toBe('First error')

    // Set new error
    uiStore.errorMessage = 'Second error'
    await wrapper.vm.$nextTick()

    // Advance time by 3 more seconds (total 6s from first, 3s from second)
    vi.advanceTimersByTime(3000)
    expect(uiStore.errorMessage).toBe('Second error')

    // Advance time by 2 more seconds (total 5s from second error)
    vi.advanceTimersByTime(2000)
    expect(uiStore.errorMessage).toBeNull()
  })

  it('should have proper accessibility attributes', () => {
    const uiStore = useUIStateStore()
    uiStore.errorMessage = 'Accessibility test'

    const wrapper = mount(ErrorToast)
    const alert = wrapper.find('[role="alert"]')

    expect(alert.attributes('aria-live')).toBe('assertive')
  })

  it('should display error icon', () => {
    const uiStore = useUIStateStore()
    uiStore.errorMessage = 'Icon test'

    const wrapper = mount(ErrorToast)

    const svg = wrapper.find('svg[aria-hidden="true"]')
    expect(svg.exists()).toBe(true)
  })

  it('should update displayed message when error changes', async () => {
    const uiStore = useUIStateStore()
    uiStore.errorMessage = 'Initial error'

    const wrapper = mount(ErrorToast)
    expect(wrapper.text()).toContain('Initial error')

    uiStore.errorMessage = 'Updated error'
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Updated error')
  })
})
