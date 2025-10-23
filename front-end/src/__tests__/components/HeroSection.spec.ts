import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import HeroSection from '@/components/HeroSection.vue'
import type { HeroSectionProps } from '@/types'

/**
 * HeroSection 組件單元測試
 * 測試範圍：
 * - 組件渲染
 * - Props 驗證
 * - CTA 點擊導航
 * - 防止重複點擊
 * - 鍵盤導航（Tab + Enter）
 * - ARIA 標籤
 */

describe('HeroSection.vue', () => {
  // 測試用 Props
  const defaultProps: HeroSectionProps = {
    title: '花牌遊戲「來來」',
    subtitle: '體驗傳統日本花牌遊戲的魅力',
    ctaText: '開始遊戲',
    ctaTarget: '/game'
  }

  // Router 模擬
  let router: ReturnType<typeof createRouter>

  beforeEach(() => {
    // 建立測試用 Router
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div>Home</div>' } },
        { path: '/game', component: { template: '<div>Game</div>' } }
      ]
    })
  })

  // ========================================
  // 組件渲染測試
  // ========================================

  it('應該正確渲染組件', () => {
    const wrapper = mount(HeroSection, {
      props: defaultProps,
      global: {
        plugins: [router]
      }
    })

    expect(wrapper.exists()).toBe(true)
    expect(wrapper.find('.hero-section').exists()).toBe(true)
  })

  it('應該正確顯示標題和副標題', () => {
    const wrapper = mount(HeroSection, {
      props: defaultProps,
      global: {
        plugins: [router]
      }
    })

    const title = wrapper.find('.hero-title')
    const subtitle = wrapper.find('.hero-subtitle')

    expect(title.text()).toBe(defaultProps.title)
    expect(subtitle.text()).toBe(defaultProps.subtitle)
  })

  it('應該正確顯示 CTA 按鈕文字', () => {
    const wrapper = mount(HeroSection, {
      props: defaultProps,
      global: {
        plugins: [router]
      }
    })

    const ctaButton = wrapper.find('.hero-cta')
    expect(ctaButton.text()).toBe(defaultProps.ctaText)
  })

  // ========================================
  // Props 驗證測試
  // ========================================

  it('應該接受並顯示自定義 backgroundImage', () => {
    const customProps: HeroSectionProps = {
      ...defaultProps,
      backgroundImage: '/images/hero-bg.jpg'
    }

    const wrapper = mount(HeroSection, {
      props: customProps,
      global: {
        plugins: [router]
      }
    })

    const section = wrapper.find('.hero-section')
    expect(section.attributes('style')).toContain('background-image')
    expect(section.attributes('style')).toContain('/images/hero-bg.jpg')
  })

  it('應該在沒有 backgroundImage 時使用預設背景色', () => {
    const wrapper = mount(HeroSection, {
      props: defaultProps,
      global: {
        plugins: [router]
      }
    })

    const section = wrapper.find('.hero-section')
    const style = section.attributes('style')
    // style 可能為 undefined 或空字串
    if (style) {
      expect(style).not.toContain('background-image')
    } else {
      expect(style).toBeUndefined()
    }
  })

  // ========================================
  // CTA 點擊導航測試
  // ========================================

  it('點擊 CTA 按鈕應該導航至正確的路由', async () => {
    const wrapper = mount(HeroSection, {
      props: defaultProps,
      global: {
        plugins: [router]
      }
    })

    // 點擊 CTA 按鈕
    const ctaButton = wrapper.find('.hero-cta')
    await ctaButton.trigger('click')
    await flushPromises()

    // 驗證導航
    expect(router.currentRoute.value.path).toBe('/game')
  })

  // ========================================
  // 防止重複點擊測試
  // ========================================

  it('應該防止重複點擊導航', async () => {
    const wrapper = mount(HeroSection, {
      props: defaultProps,
      global: {
        plugins: [router]
      }
    })

    const ctaButton = wrapper.find('.hero-cta')

    // 第一次點擊
    await ctaButton.trigger('click')
    expect(ctaButton.text()).toContain('Loading...')
    expect(ctaButton.attributes('disabled')).toBeDefined()

    // 第二次點擊（應該被阻止）
    await ctaButton.trigger('click')
    await flushPromises()

    // 等待導航狀態重置
    await new Promise((resolve) => setTimeout(resolve, 1100))
    await wrapper.vm.$nextTick()

    // 驗證按鈕恢復正常狀態
    expect(ctaButton.text()).toBe(defaultProps.ctaText)
  })

  // ========================================
  // 鍵盤導航測試 (T027)
  // ========================================

  it('應該支援 Enter 鍵觸發導航', async () => {
    const wrapper = mount(HeroSection, {
      props: defaultProps,
      global: {
        plugins: [router]
      }
    })

    const ctaButton = wrapper.find('.hero-cta')

    // 觸發 Enter 鍵
    await ctaButton.trigger('keydown', { key: 'Enter' })
    await flushPromises()

    // 驗證導航
    expect(router.currentRoute.value.path).toBe('/game')
  })

  it('應該支援空格鍵觸發導航', async () => {
    const wrapper = mount(HeroSection, {
      props: defaultProps,
      global: {
        plugins: [router]
      }
    })

    const ctaButton = wrapper.find('.hero-cta')

    // 觸發空格鍵
    await ctaButton.trigger('keydown', { key: ' ' })
    await flushPromises()

    // 驗證導航
    expect(router.currentRoute.value.path).toBe('/game')
  })

  it('CTA 按鈕應該有正確的 tabindex', () => {
    const wrapper = mount(HeroSection, {
      props: defaultProps,
      global: {
        plugins: [router]
      }
    })

    const ctaButton = wrapper.find('.hero-cta')
    expect(ctaButton.attributes('tabindex')).toBe('0')
  })

  // ========================================
  // ARIA 標籤測試
  // ========================================

  it('應該有正確的 ARIA 標籤', () => {
    const wrapper = mount(HeroSection, {
      props: defaultProps,
      global: {
        plugins: [router]
      }
    })

    const section = wrapper.find('.hero-section')
    expect(section.attributes('role')).toBe('banner')
    expect(section.attributes('aria-label')).toBe('Hero Section')

    const ctaButton = wrapper.find('.hero-cta')
    expect(ctaButton.attributes('aria-label')).toBe(defaultProps.ctaText)
  })

  it('應該在導航時設定 aria-busy', async () => {
    const wrapper = mount(HeroSection, {
      props: defaultProps,
      global: {
        plugins: [router]
      }
    })

    const ctaButton = wrapper.find('.hero-cta')

    // 點擊前
    expect(ctaButton.attributes('aria-busy')).toBe('false')

    // 點擊後
    await ctaButton.trigger('click')
    expect(ctaButton.attributes('aria-busy')).toBe('true')
  })

  // ========================================
  // 錯誤處理測試
  // ========================================

  it('應該處理導航失敗的情況', async () => {
    // 建立會失敗的 Router（模擬 push 失敗）
    const failingRouter = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div>Home</div>' } }
      ]
    })

    // 模擬 push 方法拋出錯誤
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(failingRouter, 'push').mockRejectedValue(new Error('Navigation failed'))

    const wrapper = mount(HeroSection, {
      props: defaultProps,
      global: {
        plugins: [failingRouter]
      }
    })

    const ctaButton = wrapper.find('.hero-cta')
    await ctaButton.trigger('click')
    await flushPromises()

    // 等待狀態重置
    await new Promise((resolve) => setTimeout(resolve, 1100))
    await wrapper.vm.$nextTick()

    // 驗證錯誤被捕獲並記錄
    expect(consoleSpy).toHaveBeenCalledWith('Navigation failed:', expect.any(Error))

    consoleSpy.mockRestore()
  })
})
