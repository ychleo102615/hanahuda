import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import NavigationBar from '@/components/NavigationBar.vue';
import type { NavigationLink } from '@/components/NavigationBar.vue';

// Mock router
const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', component: { template: '<div>Home</div>' } },
    { path: '/game', component: { template: '<div>Game</div>' } },
  ],
});

describe('NavigationBar', () => {
  let wrapper: VueWrapper;
  const mockLinks: NavigationLink[] = [
    { label: 'Rules', target: '#rules', isCta: false },
    { label: 'About', target: '#about', isCta: false },
    { label: 'Start Game', target: '/game', isCta: true },
  ];

  beforeEach(() => {
    wrapper = mount(NavigationBar, {
      props: {
        logo: 'Hanafuda Koi-Koi',
        links: mockLinks,
        transparent: false,
      },
      global: {
        plugins: [router],
      },
    });
  });

  describe('Rendering', () => {
    it('should render logo text', () => {
      expect(wrapper.text()).toContain('Hanafuda Koi-Koi');
    });

    it('should render all navigation links', () => {
      const links = wrapper.findAll('a');
      // +1 for logo link
      expect(links.length).toBeGreaterThanOrEqual(mockLinks.length);

      mockLinks.forEach((link) => {
        expect(wrapper.text()).toContain(link.label);
      });
    });

    it('should apply CTA styling to "Start Game" button', () => {
      const ctaLink = wrapper.findAll('a').find((link) => link.text() === 'Start Game');
      expect(ctaLink).toBeTruthy();
      expect(ctaLink?.classes()).toContain('bg-accent-red');
    });

    it('should have role="navigation" and aria-label', () => {
      const nav = wrapper.find('nav');
      expect(nav.attributes('role')).toBe('navigation');
      expect(nav.attributes('aria-label')).toBe('Main navigation');
    });
  });

  describe('Mobile Menu', () => {
    it('should toggle mobile menu on button click', async () => {
      const menuButton = wrapper.find('button[aria-label="Toggle navigation menu"]');
      expect(menuButton.exists()).toBe(true);

      // Initial state: menu closed
      expect(menuButton.attributes('aria-expanded')).toBe('false');

      // Click to open
      await menuButton.trigger('click');
      expect(menuButton.attributes('aria-expanded')).toBe('true');

      const mobileMenu = wrapper.find('#mobile-menu');
      expect(mobileMenu.classes()).toContain('max-h-96');
      expect(mobileMenu.classes()).toContain('opacity-100');

      // Click to close
      await menuButton.trigger('click');
      expect(menuButton.attributes('aria-expanded')).toBe('false');
    });

    it('should close mobile menu when a link is clicked', async () => {
      const menuButton = wrapper.find('button[aria-label="Toggle navigation menu"]');

      // Open menu
      await menuButton.trigger('click');
      expect(menuButton.attributes('aria-expanded')).toBe('true');

      // Click a link
      const firstLink = wrapper.findAll('#mobile-menu a')[0];
      await firstLink.trigger('click');

      // Menu should close
      expect(menuButton.attributes('aria-expanded')).toBe('false');
    });

    it('should close mobile menu on Escape key', async () => {
      const menuButton = wrapper.find('button[aria-label="Toggle navigation menu"]');

      // Open menu
      await menuButton.trigger('click');
      expect(menuButton.attributes('aria-expanded')).toBe('true');

      // Press Escape
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      await wrapper.vm.$nextTick();

      // Menu should close
      expect(menuButton.attributes('aria-expanded')).toBe('false');
    });
  });

  describe('Sticky Header', () => {
    it('should apply sticky styles when scrolled', async () => {
      const nav = wrapper.find('nav');

      // Initial state: not sticky
      expect(nav.classes()).not.toContain('bg-primary-900/65');

      // Simulate scroll
      window.scrollY = 100;
      window.dispatchEvent(new Event('scroll'));
      await wrapper.vm.$nextTick();

      // Should be sticky
      expect(nav.classes()).toContain('bg-primary-900/65');
      expect(nav.classes()).toContain('backdrop-blur-sm');
      expect(nav.classes()).toContain('shadow-lg');
    });
  });

  describe('Navigation Behavior', () => {
    it('should emit rulesClick event when Rules link is clicked', async () => {
      // Create mock element for scroll target
      const mockElement = document.createElement('div');
      mockElement.id = 'rules';
      document.body.appendChild(mockElement);

      const rulesLink = wrapper
        .findAll('a')
        .find((link) => link.text() === 'Rules' && link.attributes('href') === '#rules');

      expect(rulesLink).toBeTruthy();

      await rulesLink!.trigger('click');

      // Check if rulesClick event was emitted
      expect(wrapper.emitted('rulesClick')).toBeTruthy();

      // Cleanup
      document.body.removeChild(mockElement);
    });

    it('should navigate to /game when Start Game is clicked', async () => {
      const pushSpy = vi.spyOn(router, 'push');

      const startGameLink = wrapper
        .findAll('a')
        .find((link) => link.text() === 'Start Game' && link.attributes('href') === '/game');

      expect(startGameLink).toBeTruthy();

      await startGameLink!.trigger('click');

      // Router push should be called with /game
      expect(pushSpy).toHaveBeenCalledWith('/game');
    });

    it('should smooth scroll to anchor links', async () => {
      // Create mock element
      const mockElement = document.createElement('div');
      mockElement.id = 'about';
      Object.defineProperty(mockElement, 'offsetTop', {
        value: 500,
        writable: true,
      });
      document.body.appendChild(mockElement);

      const scrollToSpy = vi.spyOn(window, 'scrollTo');

      const aboutLink = wrapper
        .findAll('a')
        .find((link) => link.text() === 'About' && link.attributes('href') === '#about');

      expect(aboutLink).toBeTruthy();

      await aboutLink!.trigger('click');

      // Should call window.scrollTo with smooth behavior
      expect(scrollToSpy).toHaveBeenCalledWith({
        top: expect.any(Number),
        behavior: 'smooth',
      });

      // Cleanup
      document.body.removeChild(mockElement);
      scrollToSpy.mockRestore();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support Enter key on links', async () => {
      const pushSpy = vi.spyOn(router, 'push');

      const startGameLink = wrapper
        .findAll('a')
        .find((link) => link.text() === 'Start Game');

      expect(startGameLink).toBeTruthy();

      await startGameLink!.trigger('keydown.enter');

      // Router push should be called
      expect(pushSpy).toHaveBeenCalledWith('/game');
    });

    it('should have tabindex="0" on all links', () => {
      const links = wrapper.findAll('a[tabindex="0"]');
      expect(links.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes on mobile menu button', () => {
      const menuButton = wrapper.find('button[aria-label="Toggle navigation menu"]');

      expect(menuButton.attributes('aria-expanded')).toBeDefined();
      expect(menuButton.attributes('aria-controls')).toBe('mobile-menu');
    });

    it('should open external links in new tab with proper rel attribute', async () => {
      const externalLink: NavigationLink = {
        label: 'External',
        target: 'https://example.com',
        external: true,
      };

      const wrapperWithExternal = mount(NavigationBar, {
        props: {
          logo: 'Test',
          links: [externalLink],
        },
        global: {
          plugins: [router],
        },
      });

      const link = wrapperWithExternal.find('a[href="https://example.com"]');
      expect(link.attributes('target')).toBe('_blank');
      expect(link.attributes('rel')).toBe('noopener noreferrer');
    });
  });

  describe('Transparent Background', () => {
    it('should apply transparent background when transparent prop is true', () => {
      const transparentWrapper = mount(NavigationBar, {
        props: {
          logo: 'Test',
          links: mockLinks,
          transparent: true,
        },
        global: {
          plugins: [router],
        },
      });

      const nav = transparentWrapper.find('nav');
      expect(nav.classes()).toContain('bg-transparent');
    });

    it('should apply solid background when transparent prop is false', () => {
      const nav = wrapper.find('nav');
      expect(nav.classes()).toContain('bg-primary-900');
    });
  });
});
