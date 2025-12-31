import { ref } from 'vue'

/**
 * Composable for smooth scrolling to a specific element
 *
 * @example
 * const { scrollTo, isScrolling } = useScrollTo()
 * scrollTo('rules-section', 80) // Scroll to #rules-section with 80px offset
 */
export function useScrollTo() {
  const isScrolling = ref(false)

  /**
   * Smooth scroll to specified element
   *
   * @param elementId - Target element ID (without # symbol)
   * @param offset - Scroll offset (typically for sticky header height), default 0
   */
  const scrollTo = (elementId: string, offset = 0) => {
    const element = document.getElementById(elementId)
    if (!element) {
      return
    }

    isScrolling.value = true
    const y = element.getBoundingClientRect().top + window.scrollY - offset

    window.scrollTo({
      top: y,
      behavior: 'smooth',
    })

    // Reset scrolling state (assuming animation takes about 1 second)
    setTimeout(() => {
      isScrolling.value = false
    }, 1000)
  }

  return { scrollTo, isScrolling }
}
