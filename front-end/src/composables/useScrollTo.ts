import { ref } from 'vue'

/**
 * 平滑滾動至指定元素的 composable
 *
 * @example
 * const { scrollTo, isScrolling } = useScrollTo()
 * scrollTo('rules-section', 80) // 滾動至 #rules-section，預留 80px offset
 */
export function useScrollTo() {
  const isScrolling = ref(false)

  /**
   * 平滑滾動至指定元素
   *
   * @param elementId - 目標元素的 ID (不含 # 符號)
   * @param offset - 滾動偏移量（通常用於 sticky header 高度），預設 0
   */
  const scrollTo = (elementId: string, offset = 0) => {
    const element = document.getElementById(elementId)
    if (!element) {
      console.warn(`Element with id "${elementId}" not found`)
      return
    }

    isScrolling.value = true
    const y = element.getBoundingClientRect().top + window.scrollY - offset

    window.scrollTo({
      top: y,
      behavior: 'smooth',
    })

    // 重置 scrolling 狀態（假設動畫時間約 1 秒）
    setTimeout(() => {
      isScrolling.value = false
    }, 1000)
  }

  return { scrollTo, isScrolling }
}
