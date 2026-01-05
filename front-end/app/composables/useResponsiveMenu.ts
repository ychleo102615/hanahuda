/**
 * useResponsiveMenu Composable
 *
 * @description
 * 提供響應式選單模式偵測：
 * - 電腦模式 (>=768px)：側邊滑出面板
 * - 手機模式 (<768px)：向下展開 dropdown
 */

import { ref, onMounted, onUnmounted } from 'vue'

const MOBILE_BREAKPOINT = 768

export function useResponsiveMenu() {
  const isMobile = ref(false)

  const checkMobile = () => {
    isMobile.value = window.innerWidth < MOBILE_BREAKPOINT
  }

  onMounted(() => {
    checkMobile()
    window.addEventListener('resize', checkMobile)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', checkMobile)
  })

  return {
    isMobile,
  }
}
