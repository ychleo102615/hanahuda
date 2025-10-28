import { describe, it, expect, beforeEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import YakuCarousel from '@/components/YakuCarousel.vue'
import type { YakuCard } from '@/types/rules'

describe('YakuCarousel', () => {
  let wrapper: VueWrapper
  const mockYakuList: YakuCard[] = [
    {
      id: 'goko',
      name: 'Five Brights',
      nameJa: '五光',
      category: 'hikari',
      points: 10,
      cardIds: ['0111', '0311', '0811', '1111', '1211'],
      description: 'Collect all 5 bright cards',
    },
    {
      id: 'shiko',
      name: 'Four Brights',
      nameJa: '四光',
      category: 'hikari',
      points: 8,
      cardIds: ['0111', '0311', '0811', '1211'],
      description: 'Collect 4 bright cards (excluding Rain Man)',
    },
    {
      id: 'kasu',
      name: 'Plain Cards',
      nameJa: 'かす',
      category: 'kasu',
      points: 1,
      minimumCards: 10,
      description: 'Collect 10 or more plain cards',
    },
  ]

  beforeEach(() => {
    wrapper = mount(YakuCarousel, {
      props: {
        yakuList: mockYakuList,
      },
    })
  })

  describe('Rendering', () => {
    it('should render the carousel container', () => {
      expect(wrapper.find('.relative.w-full').exists()).toBe(true)
    })

    it('should render the first yaku by default', () => {
      const title = wrapper.find('h4')
      expect(title.text()).toBe('Five Brights')
    })

    it('should render yaku points', () => {
      const pointsText = wrapper.text()
      expect(pointsText).toContain('10')
      expect(pointsText).toContain('points')
    })

    it('should render yaku description', () => {
      const description = wrapper.findAll('p')[0]
      expect(description.text()).toBe('Collect all 5 bright cards')
    })

    it('should render category badge', () => {
      const badge = wrapper.find('.px-4.py-1.rounded-full')
      expect(badge.text()).toBe('hikari')
    })

    it('should render card IDs when provided', () => {
      const cardIds = wrapper.findAll('.px-3.py-1.bg-primary-100')
      expect(cardIds.length).toBe(5) // Five Brights has 5 cards
      expect(cardIds[0].text()).toBe('0111')
    })
  })

  describe('Navigation', () => {
    it('should render previous and next buttons', () => {
      const buttons = wrapper.findAll('button')
      expect(buttons.length).toBeGreaterThanOrEqual(5) // 2 nav buttons + 3 indicator dots
    })

    it('should navigate to next yaku on next button click', async () => {
      const buttons = wrapper.findAll('button')
      const nextButton = buttons.find((btn) => btn.attributes('aria-label') === 'Next Yaku')

      await nextButton!.trigger('click')

      const title = wrapper.find('h4')
      expect(title.text()).toBe('Four Brights')
    })

    it('should navigate to previous yaku on prev button click', async () => {
      const buttons = wrapper.findAll('button')
      const nextButton = buttons.find((btn) => btn.attributes('aria-label') === 'Next Yaku')
      const prevButton = buttons.find((btn) => btn.attributes('aria-label') === 'Previous Yaku')

      // Go to second yaku
      await nextButton!.trigger('click')
      expect(wrapper.find('h4').text()).toBe('Four Brights')

      // Go back to first yaku
      await prevButton!.trigger('click')
      expect(wrapper.find('h4').text()).toBe('Five Brights')
    })

    it('should wrap around to last yaku when clicking prev on first yaku', async () => {
      const buttons = wrapper.findAll('button')
      const prevButton = buttons.find((btn) => btn.attributes('aria-label') === 'Previous Yaku')

      await prevButton!.trigger('click')

      const title = wrapper.find('h4')
      expect(title.text()).toBe('Plain Cards') // Last yaku
    })

    it('should wrap around to first yaku when clicking next on last yaku', async () => {
      const buttons = wrapper.findAll('button')
      const nextButton = buttons.find((btn) => btn.attributes('aria-label') === 'Next Yaku')

      // Click next 3 times to reach the last yaku and wrap around
      await nextButton!.trigger('click') // -> Four Brights
      await nextButton!.trigger('click') // -> Plain Cards
      await nextButton!.trigger('click') // -> Five Brights (wrapped)

      const title = wrapper.find('h4')
      expect(title.text()).toBe('Five Brights')
    })
  })

  describe('Indicator Dots', () => {
    it('should render indicator dots for each yaku', () => {
      const dots = wrapper.findAll('.w-3.h-3.rounded-full')
      expect(dots.length).toBe(mockYakuList.length)
    })

    it('should highlight the current indicator dot', () => {
      const dots = wrapper.findAll('.w-3.h-3.rounded-full')
      expect(dots[0].classes()).toContain('bg-primary-900')
      expect(dots[1].classes()).toContain('bg-gray-300')
      expect(dots[2].classes()).toContain('bg-gray-300')
    })

    it('should jump to specific yaku when clicking indicator dot', async () => {
      const dots = wrapper.findAll('.w-3.h-3.rounded-full')

      await dots[2].trigger('click')

      const title = wrapper.find('h4')
      expect(title.text()).toBe('Plain Cards')
    })

    it('should update highlighted dot after navigation', async () => {
      const buttons = wrapper.findAll('button')
      const nextButton = buttons.find((btn) => btn.attributes('aria-label') === 'Next Yaku')

      await nextButton!.trigger('click')

      const dots = wrapper.findAll('.w-3.h-3.rounded-full')
      expect(dots[0].classes()).toContain('bg-gray-300')
      expect(dots[1].classes()).toContain('bg-primary-900')
    })
  })

  describe('Category Badge Colors', () => {
    it('should apply correct color for hikari category', () => {
      const badge = wrapper.find('.px-4.py-1.rounded-full')
      expect(badge.classes()).toContain('bg-yellow-500')
    })

    it('should apply correct color for kasu category', async () => {
      const dots = wrapper.findAll('.w-3.h-3.rounded-full')
      await dots[2].trigger('click') // Navigate to "Plain Cards" (kasu)

      const badge = wrapper.find('.px-4.py-1.rounded-full')
      expect(badge.classes()).toContain('bg-gray-500')
    })
  })

  describe('Minimum Cards Display', () => {
    it('should format description with minimum cards info', async () => {
      const dots = wrapper.findAll('.w-3.h-3.rounded-full')
      await dots[2].trigger('click') // Navigate to "Plain Cards" (has minimumCards)

      const description = wrapper.findAll('p')[0]
      expect(description.text()).toContain('10+ cards needed')
    })
  })

  describe('Empty State', () => {
    it('should show empty state when yakuList is empty', () => {
      const emptyWrapper = mount(YakuCarousel, {
        props: {
          yakuList: [],
        },
      })

      expect(emptyWrapper.text()).toContain('No Yaku available')
    })

    it('should disable navigation buttons when yakuList is empty', () => {
      const emptyWrapper = mount(YakuCarousel, {
        props: {
          yakuList: [],
        },
      })

      const buttons = emptyWrapper.findAll('button')
      const navButtons = buttons.filter(
        (btn) =>
          btn.attributes('aria-label') === 'Previous Yaku' ||
          btn.attributes('aria-label') === 'Next Yaku',
      )

      navButtons.forEach((btn) => {
        expect(btn.attributes('disabled')).toBeDefined()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have aria-label on navigation buttons', () => {
      const buttons = wrapper.findAll('button')
      const prevButton = buttons.find((btn) => btn.attributes('aria-label') === 'Previous Yaku')
      const nextButton = buttons.find((btn) => btn.attributes('aria-label') === 'Next Yaku')

      expect(prevButton).toBeDefined()
      expect(nextButton).toBeDefined()
    })

    it('should have aria-label on indicator dots', () => {
      const dots = wrapper.findAll('.w-3.h-3.rounded-full')
      expect(dots[0].attributes('aria-label')).toBe('Go to slide 1')
      expect(dots[1].attributes('aria-label')).toBe('Go to slide 2')
      expect(dots[2].attributes('aria-label')).toBe('Go to slide 3')
    })
  })
})
