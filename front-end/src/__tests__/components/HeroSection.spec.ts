import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import HeroSection from '@/components/HeroSection.vue'
import type { HeroSectionProps } from '@/types'

// 建立測試用 Router
const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', component: { template: '<div>Home</div>' } },
    { path: '/game', component: { template: '<div>Game</div>' } },
  ],
})

describe('HeroSection', () => {
  const defaultProps: HeroSectionProps = {
    title: 'Test Title',
    subtitle: 'Test Subtitle',
    ctaText: 'Test CTA',
    ctaTarget: '/game',
  }

  beforeEach(() => {
    router.push('/')
  })

  describe('渲染測試', () => {
    it('應該正確渲染標題', () => {
      const wrapper = mount(HeroSection, {
        props: defaultProps,
        global: {
          plugins: [router],
        },
      })

      expect(wrapper.find('#hero-title').text()).toBe('Test Title')
    })

    it('應該正確渲染副標題', () => {
      const wrapper = mount(HeroSection, {
        props: defaultProps,
        global: {
          plugins: [router],
        },
      })

      const subtitle = wrapper.find('p')
      expect(subtitle.text()).toBe('Test Subtitle')
    })

    it('應該正確渲染 CTA 按鈕文字', () => {
      const wrapper = mount(HeroSection, {
        props: defaultProps,
        global: {
          plugins: [router],
        },
      })

      const button = wrapper.find('button')
      expect(button.text()).toContain('Test CTA')
    })

    it('當提供背景圖片時，應該設置 background-image 樣式', () => {
      const wrapper = mount(HeroSection, {
        props: {
          ...defaultProps,
          backgroundImage: '/test-image.jpg',
        },
        global: {
          plugins: [router],
        },
      })

      const section = wrapper.find('section')
      expect(section.attributes('style')).toContain('background-image')
      expect(section.attributes('style')).toContain('/test-image.jpg')
    })
  })

  describe('Props 驗證', () => {
    it('所有必填 props 都應該被正確傳遞', () => {
      const wrapper = mount(HeroSection, {
        props: defaultProps,
        global: {
          plugins: [router],
        },
      })

      expect(wrapper.props('title')).toBe('Test Title')
      expect(wrapper.props('subtitle')).toBe('Test Subtitle')
      expect(wrapper.props('ctaText')).toBe('Test CTA')
      expect(wrapper.props('ctaTarget')).toBe('/game')
    })

    it('backgroundImage 為可選 prop', () => {
      const wrapper = mount(HeroSection, {
        props: defaultProps,
        global: {
          plugins: [router],
        },
      })

      expect(wrapper.props('backgroundImage')).toBeUndefined()
    })
  })

  describe('CTA 按鈕互動', () => {
    it('點擊 CTA 按鈕應該導航至目標路徑', async () => {
      const wrapper = mount(HeroSection, {
        props: defaultProps,
        global: {
          plugins: [router],
        },
      })

      const button = wrapper.find('button')
      await button.trigger('click')

      // 等待導航完成
      await wrapper.vm.$nextTick()
      await new Promise((resolve) => setTimeout(resolve, 100))
      expect(router.currentRoute.value.path).toBe('/game')
    })

    it('導航進行中應該顯示 loading 狀態', async () => {
      const wrapper = mount(HeroSection, {
        props: defaultProps,
        global: {
          plugins: [router],
        },
      })

      const button = wrapper.find('button')

      // 點擊按鈕
      await button.trigger('click')

      // 按鈕應該被禁用
      expect(button.attributes('disabled')).toBeDefined()
      expect(button.attributes('aria-busy')).toBe('true')

      // 應該顯示 loading spinner
      const spinner = wrapper.find('svg.animate-spin')
      expect(spinner.exists()).toBe(true)
    })

    it('防止重複點擊：第二次點擊應該被忽略', async () => {
      const wrapper = mount(HeroSection, {
        props: defaultProps,
        global: {
          plugins: [router],
        },
      })

      const button = wrapper.find('button')
      const pushSpy = vi.spyOn(router, 'push')

      // 第一次點擊
      await button.trigger('click')

      // 第二次點擊（在導航完成前）
      await button.trigger('click')

      // router.push 應該只被呼叫一次
      expect(pushSpy).toHaveBeenCalledTimes(1)
      expect(pushSpy).toHaveBeenCalledWith('/game')
    })
  })

  describe('鍵盤導航測試', () => {
    it('按下 Enter 鍵應該觸發導航', async () => {
      const wrapper = mount(HeroSection, {
        props: defaultProps,
        global: {
          plugins: [router],
        },
      })

      const button = wrapper.find('button')
      await button.trigger('keydown', { key: 'Enter' })

      await router.isReady()
      expect(router.currentRoute.value.path).toBe('/game')
    })

    it('按下 Space 鍵應該觸發導航', async () => {
      const wrapper = mount(HeroSection, {
        props: defaultProps,
        global: {
          plugins: [router],
        },
      })

      const button = wrapper.find('button')
      await button.trigger('keydown', { key: ' ' })

      await router.isReady()
      expect(router.currentRoute.value.path).toBe('/game')
    })

    it('按鈕應該有正確的 tabindex', () => {
      const wrapper = mount(HeroSection, {
        props: defaultProps,
        global: {
          plugins: [router],
        },
      })

      const button = wrapper.find('button')
      expect(button.attributes('tabindex')).toBe('0')
    })
  })

  describe('無障礙 (Accessibility)', () => {
    it('section 應該有 aria-labelledby 屬性', () => {
      const wrapper = mount(HeroSection, {
        props: defaultProps,
        global: {
          plugins: [router],
        },
      })

      const section = wrapper.find('section')
      expect(section.attributes('aria-labelledby')).toBe('hero-title')
    })

    it('標題應該有正確的 id', () => {
      const wrapper = mount(HeroSection, {
        props: defaultProps,
        global: {
          plugins: [router],
        },
      })

      const title = wrapper.find('h1')
      expect(title.attributes('id')).toBe('hero-title')
    })

    it('loading 狀態時按鈕應該有 aria-busy 屬性', async () => {
      const wrapper = mount(HeroSection, {
        props: defaultProps,
        global: {
          plugins: [router],
        },
      })

      const button = wrapper.find('button')
      await button.trigger('click')

      expect(button.attributes('aria-busy')).toBe('true')
    })

    it('背景裝飾層應該有 aria-hidden', () => {
      const wrapper = mount(HeroSection, {
        props: defaultProps,
        global: {
          plugins: [router],
        },
      })

      const decorativeLayer = wrapper.find('.absolute.inset-0')
      expect(decorativeLayer.attributes('aria-hidden')).toBe('true')
    })

    it('SVG 圖示應該有 aria-hidden', () => {
      const wrapper = mount(HeroSection, {
        props: defaultProps,
        global: {
          plugins: [router],
        },
      })

      const svgIcons = wrapper.findAll('svg')
      svgIcons.forEach((svg) => {
        expect(svg.attributes('aria-hidden')).toBe('true')
      })
    })
  })

  describe('響應式設計', () => {
    it('應該包含手機版樣式類別', () => {
      const wrapper = mount(HeroSection, {
        props: defaultProps,
        global: {
          plugins: [router],
        },
      })

      const section = wrapper.find('section')
      expect(section.classes()).toContain('min-h-screen')

      const title = wrapper.find('h1')
      expect(title.classes()).toContain('text-4xl')
    })

    it('應該包含桌面版響應式樣式類別', () => {
      const wrapper = mount(HeroSection, {
        props: defaultProps,
        global: {
          plugins: [router],
        },
      })

      const section = wrapper.find('section')
      expect(section.classes()).toContain('min-h-screen')

      const title = wrapper.find('h1')
      expect(title.classes()).toContain('md:text-6xl')
      expect(title.classes()).toContain('lg:text-7xl')
    })
  })
})
