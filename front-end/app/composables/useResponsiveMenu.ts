/**
 * useResponsiveMenu Composable
 *
 * @description
 * 提供響應式選單模式偵測。
 * - 電腦模式：側邊滑出（ActionPanel）
 * - 手機模式：從上方彈出（Popover）
 *
 * 使用 Tailwind 的 md 斷點 (768px) 作為分界
 */

import { ref, onMounted, onUnmounted } from 'vue'

export type MenuMode = 'desktop' | 'mobile'

const MOBILE_BREAKPOINT = 768 // Tailwind md breakpoint

export function useResponsiveMenu() {
  // 預設為 desktop（SSR 友善）
  const isMobile = ref(false)
  const menuMode = ref<MenuMode>('desktop')

  const updateMenuMode = () => {
    const mobile = window.innerWidth < MOBILE_BREAKPOINT
    isMobile.value = mobile
    menuMode.value = mobile ? 'mobile' : 'desktop'
  }

  onMounted(() => {
    updateMenuMode()
    window.addEventListener('resize', updateMenuMode)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', updateMenuMode)
  })

  return {
    /** 是否為手機模式 */
    isMobile,
    /** 選單模式：'desktop' | 'mobile' */
    menuMode,
  }
}
