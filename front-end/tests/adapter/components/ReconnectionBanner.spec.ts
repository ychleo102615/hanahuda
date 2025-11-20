/**
 * ReconnectionBanner Component Tests
 *
 * @description
 * 測試重連提示橫幅組件的顯示邏輯
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import ReconnectionBanner from '../../../src/views/GamePage/components/ReconnectionBanner.vue'
import { useUIStateStore } from '../../../src/user-interface/adapter/stores/uiState'

describe('ReconnectionBanner', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should not be visible when connected', () => {
    const uiStore = useUIStateStore()
    uiStore.setConnectionStatus('connected')
    uiStore.reconnecting = false

    const wrapper = mount(ReconnectionBanner)

    expect(wrapper.find('.reconnection-banner').exists()).toBe(false)
  })

  it('should be visible when reconnecting', async () => {
    const uiStore = useUIStateStore()
    uiStore.showReconnectionMessage()

    const wrapper = mount(ReconnectionBanner)

    expect(wrapper.find('.reconnection-banner').exists()).toBe(true)
    expect(wrapper.text()).toContain('連線中斷，正在嘗試重連...')
  })

  it('should be visible when connecting', async () => {
    const uiStore = useUIStateStore()
    uiStore.setConnectionStatus('connecting')

    const wrapper = mount(ReconnectionBanner)

    expect(wrapper.find('.reconnection-banner').exists()).toBe(true)
    expect(wrapper.text()).toContain('正在連線...')
  })

  it('should hide when connection is restored', async () => {
    const uiStore = useUIStateStore()
    uiStore.showReconnectionMessage()

    const wrapper = mount(ReconnectionBanner)

    expect(wrapper.find('.reconnection-banner').exists()).toBe(true)

    uiStore.hideReconnectionMessage()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.reconnection-banner').exists()).toBe(false)
  })

  it('should have loading spinner when visible', () => {
    const uiStore = useUIStateStore()
    uiStore.showReconnectionMessage()

    const wrapper = mount(ReconnectionBanner)

    expect(wrapper.find('.loading-spinner').exists()).toBe(true)
  })

  it('should have proper accessibility attributes', () => {
    const uiStore = useUIStateStore()
    uiStore.showReconnectionMessage()

    const wrapper = mount(ReconnectionBanner)
    const banner = wrapper.find('.reconnection-banner')

    expect(banner.attributes('role')).toBe('alert')
    expect(banner.attributes('aria-live')).toBe('polite')
  })

  it('should update message when status changes', async () => {
    const uiStore = useUIStateStore()

    const wrapper = mount(ReconnectionBanner)

    // Start with connecting status
    uiStore.setConnectionStatus('connecting')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('正在連線...')

    // Change to reconnecting
    uiStore.showReconnectionMessage()
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('連線中斷，正在嘗試重連...')
  })
})
