import { describe, it, expect, beforeEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import RulesSection from '@/components/RulesSection.vue'
import type { RuleCategory, YakuCard } from '@/types/rules'

describe('RulesSection', () => {
  let wrapper: VueWrapper
  const mockCategories: RuleCategory[] = [
    {
      id: 'test-category-1',
      title: 'Test Category 1',
      defaultExpanded: true,
      sections: [
        {
          type: 'paragraph',
          text: 'This is a test paragraph.',
        },
      ],
    },
    {
      id: 'test-category-2',
      title: 'Test Category 2',
      defaultExpanded: false,
      sections: [
        {
          type: 'list',
          items: ['Item 1', 'Item 2', 'Item 3'],
        },
      ],
    },
  ]

  const mockYakuList: YakuCard[] = [
    {
      id: 'test-yaku-1',
      name: 'Test Yaku',
      nameJa: 'テスト役',
      category: 'hikari',
      points: 10,
      cardIds: ['0111', '0311'],
      description: 'A test yaku',
    },
  ]

  beforeEach(() => {
    wrapper = mount(RulesSection, {
      props: {
        categories: mockCategories,
        yakuList: mockYakuList,
      },
    })
  })

  describe('Rendering', () => {
    it('should render the section with correct ID', () => {
      expect(wrapper.find('#rules').exists()).toBe(true)
    })

    it('should render the section header', () => {
      const header = wrapper.find('h2')
      expect(header.exists()).toBe(true)
      expect(header.text()).toBe('Game Rules')
    })

    it('should render all category cards', () => {
      const categoryCards = wrapper.findAll('.grid > .bg-white.rounded-lg.shadow-md')
      expect(categoryCards.length).toBe(mockCategories.length)
    })

    it('should render category titles', () => {
      const titles = wrapper.findAll('h3')
      // First h2 is "Game Rules", next h3s are category titles, last h3 is "Featured Yaku"
      expect(titles[0].text()).toBe('Test Category 1')
      expect(titles[1].text()).toBe('Test Category 2')
    })
  })

  describe('Expand/Collapse Logic', () => {
    it('should expand default-expanded categories on mount', () => {
      const firstCategory = wrapper.find('#rules-content-test-category-1')
      expect(firstCategory.classes()).toContain('max-h-screen')
    })

    it('should collapse non-default categories on mount', () => {
      const secondCategory = wrapper.find('#rules-content-test-category-2')
      expect(secondCategory.classes()).toContain('max-h-0')
    })

    it('should toggle category expansion on button click', async () => {
      const buttons = wrapper.findAll('button')
      const secondCategoryButton = buttons[1] // First button is for category 1

      // Initially collapsed
      const secondCategory = wrapper.find('#rules-content-test-category-2')
      expect(secondCategory.classes()).toContain('max-h-0')

      // Click to expand
      await secondCategoryButton.trigger('click')
      expect(secondCategory.classes()).toContain('max-h-screen')

      // Click to collapse
      await secondCategoryButton.trigger('click')
      expect(secondCategory.classes()).toContain('max-h-0')
    })

    it('should update toggle icon on expansion', async () => {
      const buttons = wrapper.findAll('button')
      const secondCategoryButton = buttons[1]

      // Initially shows '+' (collapsed)
      expect(secondCategoryButton.text()).toContain('+')

      // After click shows '−' (expanded)
      await secondCategoryButton.trigger('click')
      expect(secondCategoryButton.text()).toContain('−')
    })
  })

  describe('ARIA Attributes', () => {
    it('should have correct aria-expanded attribute', async () => {
      const buttons = wrapper.findAll('button')
      const firstButton = buttons[0]
      const secondButton = buttons[1]

      // First category is default expanded
      expect(firstButton.attributes('aria-expanded')).toBe('true')

      // Second category is default collapsed
      expect(secondButton.attributes('aria-expanded')).toBe('false')

      // After click, aria-expanded should update
      await secondButton.trigger('click')
      expect(secondButton.attributes('aria-expanded')).toBe('true')
    })

    it('should have correct aria-controls attribute', () => {
      const buttons = wrapper.findAll('button')
      const firstButton = buttons[0]
      const secondButton = buttons[1]

      expect(firstButton.attributes('aria-controls')).toBe('rules-content-test-category-1')
      expect(secondButton.attributes('aria-controls')).toBe('rules-content-test-category-2')
    })
  })

  describe('Content Rendering', () => {
    it('should render paragraph sections correctly', () => {
      const paragraph = wrapper.find('#rules-content-test-category-1 p')
      expect(paragraph.exists()).toBe(true)
      expect(paragraph.text()).toBe('This is a test paragraph.')
    })

    it('should render list sections correctly', async () => {
      const buttons = wrapper.findAll('button')
      const secondCategoryButton = buttons[1]

      // Expand second category to reveal list
      await secondCategoryButton.trigger('click')

      const list = wrapper.find('#rules-content-test-category-2 ul')
      expect(list.exists()).toBe(true)

      const listItems = list.findAll('li')
      expect(listItems.length).toBe(3)
      expect(listItems[0].text()).toBe('Item 1')
      expect(listItems[1].text()).toBe('Item 2')
      expect(listItems[2].text()).toBe('Item 3')
    })
  })

  describe('Yaku Carousel Integration', () => {
    it('should render Yaku Carousel when yakuList is provided', () => {
      const carousel = wrapper.findComponent({ name: 'YakuCarousel' })
      expect(carousel.exists()).toBe(true)
    })

    it('should not render Yaku Carousel when yakuList is empty', async () => {
      const emptyWrapper = mount(RulesSection, {
        props: {
          categories: mockCategories,
          yakuList: [],
        },
      })

      const carousel = emptyWrapper.findComponent({ name: 'YakuCarousel' })
      expect(carousel.exists()).toBe(false)
    })

    it('should pass yakuList to YakuCarousel', () => {
      const carousel = wrapper.findComponent({ name: 'YakuCarousel' })
      expect(carousel.props('yakuList')).toEqual(mockYakuList)
    })
  })

  describe('Exposed Methods', () => {
    it('should expose expandAll method', () => {
      expect(wrapper.vm.expandAll).toBeDefined()
      expect(typeof wrapper.vm.expandAll).toBe('function')
    })

    it('expandAll should expand all categories', async () => {
      // Initially, second category is collapsed
      let secondCategory = wrapper.find('#rules-content-test-category-2')
      expect(secondCategory.classes()).toContain('max-h-0')

      // Call expandAll
      wrapper.vm.expandAll()
      await wrapper.vm.$nextTick()

      // Now second category should be expanded
      secondCategory = wrapper.find('#rules-content-test-category-2')
      expect(secondCategory.classes()).toContain('max-h-screen')
    })
  })
})
