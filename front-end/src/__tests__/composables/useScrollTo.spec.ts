import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useScrollTo } from '@/composables/useScrollTo';

describe('useScrollTo', () => {
  let scrollToSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Mock window.scrollTo
    scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});

    // Mock console.warn
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Reset scroll position
    window.scrollY = 0;
  });

  afterEach(() => {
    scrollToSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    // Clean up DOM
    document.body.innerHTML = '';
  });

  describe('Basic Functionality', () => {
    it('should scroll to element with smooth behavior', () => {
      const { scrollTo } = useScrollTo();

      // Create mock element
      const mockElement = document.createElement('div');
      mockElement.id = 'test-section';
      Object.defineProperty(mockElement, 'offsetTop', {
        value: 500,
        configurable: true,
      });
      // Mock getBoundingClientRect
      mockElement.getBoundingClientRect = vi.fn(() => ({
        top: 500,
        bottom: 600,
        left: 0,
        right: 0,
        width: 0,
        height: 100,
        x: 0,
        y: 500,
        toJSON: () => {},
      }));
      document.body.appendChild(mockElement);

      scrollTo('test-section');

      expect(scrollToSpy).toHaveBeenCalledWith({
        top: expect.any(Number),
        behavior: 'smooth',
      });
    });

    it('should apply offset when scrolling', () => {
      const { scrollTo } = useScrollTo();

      // Create mock element
      const mockElement = document.createElement('div');
      mockElement.id = 'test-section';
      mockElement.getBoundingClientRect = vi.fn(() => ({
        top: 500,
        bottom: 600,
        left: 0,
        right: 0,
        width: 0,
        height: 100,
        x: 0,
        y: 500,
        toJSON: () => {},
      }));
      document.body.appendChild(mockElement);

      const offset = 80; // Sticky header height
      window.scrollY = 0;

      scrollTo('test-section', offset);

      expect(scrollToSpy).toHaveBeenCalledWith({
        top: 500 - offset, // 500 (element top) - 80 (offset)
        behavior: 'smooth',
      });
    });

    it('should handle element not found gracefully', () => {
      const { scrollTo } = useScrollTo();

      scrollTo('non-existent-element');

      expect(consoleWarnSpy).toHaveBeenCalledWith('Element with id "non-existent-element" not found');
      expect(scrollToSpy).not.toHaveBeenCalled();
    });
  });

  describe('isScrolling State', () => {
    it('should set isScrolling to true when scrolling starts', () => {
      const { scrollTo, isScrolling } = useScrollTo();

      // Create mock element
      const mockElement = document.createElement('div');
      mockElement.id = 'test-section';
      mockElement.getBoundingClientRect = vi.fn(() => ({
        top: 500,
        bottom: 600,
        left: 0,
        right: 0,
        width: 0,
        height: 100,
        x: 0,
        y: 500,
        toJSON: () => {},
      }));
      document.body.appendChild(mockElement);

      expect(isScrolling.value).toBe(false);

      scrollTo('test-section');

      expect(isScrolling.value).toBe(true);
    });

    it('should reset isScrolling to false after timeout', async () => {
      vi.useFakeTimers();

      const { scrollTo, isScrolling } = useScrollTo();

      // Create mock element
      const mockElement = document.createElement('div');
      mockElement.id = 'test-section';
      mockElement.getBoundingClientRect = vi.fn(() => ({
        top: 500,
        bottom: 600,
        left: 0,
        right: 0,
        width: 0,
        height: 100,
        x: 0,
        y: 500,
        toJSON: () => {},
      }));
      document.body.appendChild(mockElement);

      scrollTo('test-section');
      expect(isScrolling.value).toBe(true);

      // Fast-forward time by 1000ms
      vi.advanceTimersByTime(1000);

      expect(isScrolling.value).toBe(false);

      vi.useRealTimers();
    });

    it('should not set isScrolling if element not found', () => {
      const { scrollTo, isScrolling } = useScrollTo();

      expect(isScrolling.value).toBe(false);

      scrollTo('non-existent-element');

      expect(isScrolling.value).toBe(false);
    });
  });

  describe('Scroll Position Calculation', () => {
    it('should calculate correct scroll position with window scrollY', () => {
      const { scrollTo } = useScrollTo();

      // Set current scroll position
      window.scrollY = 200;

      // Create mock element
      const mockElement = document.createElement('div');
      mockElement.id = 'test-section';
      mockElement.getBoundingClientRect = vi.fn(() => ({
        top: 300, // Relative to current viewport
        bottom: 400,
        left: 0,
        right: 0,
        width: 0,
        height: 100,
        x: 0,
        y: 300,
        toJSON: () => {},
      }));
      document.body.appendChild(mockElement);

      scrollTo('test-section', 0);

      // Expected: element.getBoundingClientRect().top (300) + window.scrollY (200) - offset (0)
      expect(scrollToSpy).toHaveBeenCalledWith({
        top: 500, // 300 + 200
        behavior: 'smooth',
      });
    });

    it('should handle negative scroll positions correctly', () => {
      const { scrollTo } = useScrollTo();

      window.scrollY = 0;

      // Create mock element at the top
      const mockElement = document.createElement('div');
      mockElement.id = 'test-section';
      mockElement.getBoundingClientRect = vi.fn(() => ({
        top: 50,
        bottom: 150,
        left: 0,
        right: 0,
        width: 0,
        height: 100,
        x: 0,
        y: 50,
        toJSON: () => {},
      }));
      document.body.appendChild(mockElement);

      // Large offset might cause negative position
      scrollTo('test-section', 100);

      expect(scrollToSpy).toHaveBeenCalledWith({
        top: -50, // 50 - 100 (offset)
        behavior: 'smooth',
      });
    });
  });

  describe('Multiple Calls', () => {
    it('should handle multiple consecutive scrollTo calls', () => {
      const { scrollTo } = useScrollTo();

      // Create mock elements
      const element1 = document.createElement('div');
      element1.id = 'section-1';
      element1.getBoundingClientRect = vi.fn(() => ({
        top: 100,
        bottom: 200,
        left: 0,
        right: 0,
        width: 0,
        height: 100,
        x: 0,
        y: 100,
        toJSON: () => {},
      }));
      document.body.appendChild(element1);

      const element2 = document.createElement('div');
      element2.id = 'section-2';
      element2.getBoundingClientRect = vi.fn(() => ({
        top: 300,
        bottom: 400,
        left: 0,
        right: 0,
        width: 0,
        height: 100,
        x: 0,
        y: 300,
        toJSON: () => {},
      }));
      document.body.appendChild(element2);

      scrollTo('section-1');
      scrollTo('section-2');

      expect(scrollToSpy).toHaveBeenCalledTimes(2);
      expect(scrollToSpy).toHaveBeenNthCalledWith(1, {
        top: 100,
        behavior: 'smooth',
      });
      expect(scrollToSpy).toHaveBeenNthCalledWith(2, {
        top: 300,
        behavior: 'smooth',
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle element ID with special characters', () => {
      const { scrollTo } = useScrollTo();

      const mockElement = document.createElement('div');
      mockElement.id = 'section-with-dash_and_underscore';
      mockElement.getBoundingClientRect = vi.fn(() => ({
        top: 200,
        bottom: 300,
        left: 0,
        right: 0,
        width: 0,
        height: 100,
        x: 0,
        y: 200,
        toJSON: () => {},
      }));
      document.body.appendChild(mockElement);

      scrollTo('section-with-dash_and_underscore');

      expect(scrollToSpy).toHaveBeenCalled();
    });

    it('should handle zero offset', () => {
      const { scrollTo } = useScrollTo();

      const mockElement = document.createElement('div');
      mockElement.id = 'test-section';
      mockElement.getBoundingClientRect = vi.fn(() => ({
        top: 200,
        bottom: 300,
        left: 0,
        right: 0,
        width: 0,
        height: 100,
        x: 0,
        y: 200,
        toJSON: () => {},
      }));
      document.body.appendChild(mockElement);

      scrollTo('test-section', 0);

      expect(scrollToSpy).toHaveBeenCalledWith({
        top: 200,
        behavior: 'smooth',
      });
    });

    it('should handle default offset parameter', () => {
      const { scrollTo } = useScrollTo();

      const mockElement = document.createElement('div');
      mockElement.id = 'test-section';
      mockElement.getBoundingClientRect = vi.fn(() => ({
        top: 200,
        bottom: 300,
        left: 0,
        right: 0,
        width: 0,
        height: 100,
        x: 0,
        y: 200,
        toJSON: () => {},
      }));
      document.body.appendChild(mockElement);

      // Call without offset parameter
      scrollTo('test-section');

      expect(scrollToSpy).toHaveBeenCalledWith({
        top: 200, // No offset applied
        behavior: 'smooth',
      });
    });
  });
});
