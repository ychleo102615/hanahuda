import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Footer from '@/components/Footer.vue'
import type { AttributionLink } from '@/components/Footer.vue'

describe('Footer.vue', () => {
  const mockAttributions: AttributionLink[] = [
    {
      name: 'Hanafuda Card Images',
      source: 'Louie Mantia',
      license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    },
    {
      name: 'Game Rules',
      source: 'Wikipedia',
      license: 'CC BY-SA 3.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
    },
  ]

  describe('Rendering', () => {
    it('should render copyright year and project name', () => {
      const wrapper = mount(Footer, {
        props: {
          copyrightYear: 2025,
          projectName: 'Hanafuda Koi-Koi',
          attributions: [],
        },
      })

      expect(wrapper.text()).toContain('© 2025 Hanafuda Koi-Koi')
    })

    it('should render technology stack information', () => {
      const wrapper = mount(Footer, {
        props: {
          copyrightYear: 2025,
          projectName: 'Test Project',
          attributions: [],
        },
      })

      expect(wrapper.text()).toContain('Built with Vue 3, TypeScript, and Tailwind CSS')
    })

    it('should render all attribution items', () => {
      const wrapper = mount(Footer, {
        props: {
          copyrightYear: 2025,
          projectName: 'Test Project',
          attributions: mockAttributions,
        },
      })

      // 驗證所有 attribution 資訊都顯示
      expect(wrapper.text()).toContain('Hanafuda Card Images')
      expect(wrapper.text()).toContain('Louie Mantia')
      expect(wrapper.text()).toContain('CC BY-SA 4.0')
      expect(wrapper.text()).toContain('Game Rules')
      expect(wrapper.text()).toContain('Wikipedia')
      expect(wrapper.text()).toContain('CC BY-SA 3.0')
    })

    it('should render Attributions section header', () => {
      const wrapper = mount(Footer, {
        props: {
          copyrightYear: 2025,
          projectName: 'Test Project',
          attributions: mockAttributions,
        },
      })

      expect(wrapper.text()).toContain('Attributions')
    })
  })

  describe('External Links', () => {
    it('should render external links with correct href', () => {
      const wrapper = mount(Footer, {
        props: {
          copyrightYear: 2025,
          projectName: 'Test Project',
          attributions: mockAttributions,
        },
      })

      const links = wrapper.findAll('a')
      expect(links.length).toBe(2)
      expect(links[0].attributes('href')).toBe('https://creativecommons.org/licenses/by-sa/4.0/')
      expect(links[1].attributes('href')).toBe('https://creativecommons.org/licenses/by-sa/3.0/')
    })

    it('should have target="_blank" for external links', () => {
      const wrapper = mount(Footer, {
        props: {
          copyrightYear: 2025,
          projectName: 'Test Project',
          attributions: mockAttributions,
        },
      })

      const links = wrapper.findAll('a')
      links.forEach((link) => {
        expect(link.attributes('target')).toBe('_blank')
      })
    })

    it('should have rel="noopener noreferrer" for security', () => {
      const wrapper = mount(Footer, {
        props: {
          copyrightYear: 2025,
          projectName: 'Test Project',
          attributions: mockAttributions,
        },
      })

      const links = wrapper.findAll('a')
      links.forEach((link) => {
        expect(link.attributes('rel')).toBe('noopener noreferrer')
      })
    })

    it('should render external link icon (SVG)', () => {
      const wrapper = mount(Footer, {
        props: {
          copyrightYear: 2025,
          projectName: 'Test Project',
          attributions: mockAttributions,
        },
      })

      const svgIcons = wrapper.findAll('svg')
      expect(svgIcons.length).toBe(2) // 每個 attribution 一個圖示
      svgIcons.forEach((icon) => {
        expect(icon.attributes('aria-hidden')).toBe('true')
      })
    })
  })

  describe('Accessibility', () => {
    it('should have semantic footer element', () => {
      const wrapper = mount(Footer, {
        props: {
          copyrightYear: 2025,
          projectName: 'Test Project',
          attributions: mockAttributions,
        },
      })

      expect(wrapper.element.tagName).toBe('FOOTER')
    })

    it('should have aria-label for license links', () => {
      const wrapper = mount(Footer, {
        props: {
          copyrightYear: 2025,
          projectName: 'Test Project',
          attributions: mockAttributions,
        },
      })

      const links = wrapper.findAll('a')
      expect(links[0].attributes('aria-label')).toContain('Hanafuda Card Images')
      expect(links[0].attributes('aria-label')).toContain('CC BY-SA 4.0')
      expect(links[1].attributes('aria-label')).toContain('Game Rules')
      expect(links[1].attributes('aria-label')).toContain('CC BY-SA 3.0')
    })
  })

  describe('Responsive Design', () => {
    it('should have responsive flex layout classes', () => {
      const wrapper = mount(Footer, {
        props: {
          copyrightYear: 2025,
          projectName: 'Test Project',
          attributions: mockAttributions,
        },
      })

      const mainContainer = wrapper.find('.container')
      expect(mainContainer.exists()).toBe(true)

      // 檢查響應式佈局 class (flex-col md:flex-row)
      const flexContainer = wrapper.find('.flex.flex-col')
      expect(flexContainer.exists()).toBe(true)
      expect(flexContainer.classes()).toContain('md:flex-row')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty attributions array', () => {
      const wrapper = mount(Footer, {
        props: {
          copyrightYear: 2025,
          projectName: 'Test Project',
          attributions: [],
        },
      })

      expect(wrapper.text()).toContain('© 2025 Test Project')
      expect(wrapper.text()).toContain('Attributions')
      expect(wrapper.findAll('a').length).toBe(0)
    })

    it('should handle single attribution', () => {
      const wrapper = mount(Footer, {
        props: {
          copyrightYear: 2025,
          projectName: 'Test Project',
          attributions: [mockAttributions[0]],
        },
      })

      expect(wrapper.findAll('a').length).toBe(1)
      expect(wrapper.text()).toContain('Hanafuda Card Images')
    })

    it('should handle future copyright year', () => {
      const wrapper = mount(Footer, {
        props: {
          copyrightYear: 2030,
          projectName: 'Future Project',
          attributions: [],
        },
      })

      expect(wrapper.text()).toContain('© 2030 Future Project')
    })
  })
})
