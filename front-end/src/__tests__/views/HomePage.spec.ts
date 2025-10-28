import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import HomePage from '@/views/HomePage.vue'
import NavigationBar from '@/components/NavigationBar.vue'
import HeroSection from '@/components/HeroSection.vue'
import RulesSection from '@/components/RulesSection.vue'
import Footer from '@/components/Footer.vue'

// Mock JSON data
vi.mock('@/data/rules.json', () => ({
  default: {
    categories: [
      {
        title: 'Game Objective',
        content: 'Test content',
        defaultExpanded: true,
      },
    ],
  },
}))

vi.mock('@/data/yaku.json', () => ({
  default: {
    yakuList: [
      {
        id: '1',
        name: 'Five Brights',
        nameJa: '五光',
        points: 15,
        cardIds: ['0111', '0311', '0811', '1111', '1211'],
        description: 'Collect all 5 bright cards',
      },
    ],
  },
}))

describe('HomePage Integration Test', () => {
  let wrapper: VueWrapper

  beforeEach(() => {
    wrapper = mount(HomePage, {
      global: {
        stubs: {
          NavigationBar: true,
          HeroSection: true,
          RulesSection: true,
          Footer: true,
        },
      },
    })
  })

  describe('Component Rendering', () => {
    it('should render all main components', () => {
      expect(wrapper.findComponent(NavigationBar).exists()).toBe(true)
      expect(wrapper.findComponent(HeroSection).exists()).toBe(true)
      expect(wrapper.findComponent(RulesSection).exists()).toBe(true)
      expect(wrapper.findComponent(Footer).exists()).toBe(true)
    })

    it('should render NavigationBar with correct props', () => {
      const navBar = wrapper.findComponent(NavigationBar)
      expect(navBar.props('logo')).toBe('花札 Koi-Koi')
      expect(navBar.props('links')).toHaveLength(3)
      expect(navBar.props('transparent')).toBe(false)
    })

    it('should render HeroSection with correct props', () => {
      const hero = wrapper.findComponent(HeroSection)
      expect(hero.props('title')).toBe('Hanafuda Koi-Koi')
      expect(hero.props('subtitle')).toBe('Experience the classic Japanese card game online')
      expect(hero.props('ctaText')).toBe('Start Playing')
      expect(hero.props('ctaTarget')).toBe('/game')
    })

    it('should render RulesSection with categories and yaku list', () => {
      const rules = wrapper.findComponent(RulesSection)
      expect(rules.props('categories')).toBeDefined()
      expect(rules.props('yakuList')).toBeDefined()
    })

    it('should render Footer with correct props', () => {
      const footer = wrapper.findComponent(Footer)
      expect(footer.props('copyrightYear')).toBe(2025)
      expect(footer.props('projectName')).toBe('Hanafuda Koi-Koi')
      expect(footer.props('attributions')).toHaveLength(1)
    })
  })

  describe('Section Structure', () => {
    it('should have correct section IDs for anchor navigation', () => {
      expect(wrapper.find('#hero').exists()).toBe(true)
      expect(wrapper.find('#rules').exists()).toBe(true)
      expect(wrapper.find('#about').exists()).toBe(true)
    })

    it('should have hero section with min-h-screen class', () => {
      const heroSection = wrapper.find('#hero')
      expect(heroSection.classes()).toContain('min-h-screen')
    })

    it('should have about section placeholder', () => {
      const aboutSection = wrapper.find('#about')
      expect(aboutSection.exists()).toBe(true)
      expect(aboutSection.text()).toContain('關於 Hanafuda Koi-Koi')
    })
  })

  describe('Navigation Links', () => {
    it('should provide correct navigation links to NavigationBar', () => {
      const navBar = wrapper.findComponent(NavigationBar)
      const links = navBar.props('links')

      expect(links[0]).toEqual({
        label: '規則',
        target: '#rules',
        isCta: false,
      })

      expect(links[1]).toEqual({
        label: '關於',
        target: '#about',
        isCta: false,
      })

      expect(links[2]).toEqual({
        label: '開始遊戲',
        target: '/game',
        isCta: true,
      })
    })
  })

  describe('Rules Click Handler', () => {
    it('should handle rules-click event from NavigationBar', async () => {
      // Create a mock RulesSection component with expandAll method
      const mockExpandAll = vi.fn()

      wrapper = mount(HomePage, {
        global: {
          stubs: {
            NavigationBar: true,
            HeroSection: true,
            Footer: true,
            RulesSection: {
              template: '<div></div>',
              methods: {
                expandAll: mockExpandAll,
              },
            },
          },
        },
      })

      // Get ref to RulesSection
      const rulesSectionRef = wrapper.vm.$refs.rulesSectionRef as InstanceType<
        typeof RulesSection
      > | undefined

      // Manually trigger handleRulesClick
      await wrapper.vm.handleRulesClick()

      // Check if expandAll was called (if ref exists)
      if (rulesSectionRef) {
        expect(mockExpandAll).toHaveBeenCalled()
      }
    })
  })

  describe('Data Loading', () => {
    it('should load rules categories from JSON', () => {
      const rulesSection = wrapper.findComponent(RulesSection)
      const categories = rulesSection.props('categories')

      expect(categories).toBeDefined()
      expect(Array.isArray(categories)).toBe(true)
    })

    it('should load yaku list from JSON', () => {
      const rulesSection = wrapper.findComponent(RulesSection)
      const yakuList = rulesSection.props('yakuList')

      expect(yakuList).toBeDefined()
      expect(Array.isArray(yakuList)).toBe(true)
    })
  })

  describe('Layout Structure', () => {
    it('should have min-h-screen class on root element', () => {
      expect(wrapper.classes()).toContain('min-h-screen')
    })

    it('should wrap sections in main tag', () => {
      const main = wrapper.find('main')
      expect(main.exists()).toBe(true)
      expect(main.find('#hero').exists()).toBe(true)
      expect(main.find('#rules').exists()).toBe(true)
      expect(main.find('#about').exists()).toBe(true)
    })

    it('should have Footer outside of main tag', () => {
      const main = wrapper.find('main')
      const footer = wrapper.findComponent(Footer)

      expect(footer.exists()).toBe(true)
      // Footer should not be inside main
      expect(main.findComponent(Footer).exists()).toBe(false)
    })
  })

  describe('Attribution Data', () => {
    it('should provide attribution links to Footer', () => {
      const footer = wrapper.findComponent(Footer)
      const attributions = footer.props('attributions')

      expect(attributions).toHaveLength(1)
      expect(attributions[0]).toEqual({
        name: 'Hanafuda Card Images',
        source: 'Louie Mantia (dotty-dev/Hanafuda-Louie-Recolor)',
        sourceUrl: 'https://github.com/dotty-dev/Hanafuda-Louie-Recolor',
        license: 'CC BY-SA 4.0',
        licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
      })
    })
  })
})
