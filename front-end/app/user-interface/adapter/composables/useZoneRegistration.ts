/**
 * useZoneRegistration - 區域註冊 Composable
 *
 * @description
 * Vue Composable，自動處理區域註冊和取消註冊。
 * 在組件 mount 時註冊區域，unmount 時自動取消註冊。
 *
 * @since Phase 6 - User Story 4
 */

import { ref, onMounted, onUnmounted, type Ref } from 'vue'
import type { ZoneName } from '../animation/types'
import { zoneRegistry } from '../animation/ZoneRegistry'

/**
 * useZoneRegistration 選項
 */
export interface UseZoneRegistrationOptions {
  /**
   * 是否自動註冊（預設 true）
   */
  autoRegister?: boolean
}

/**
 * useZoneRegistration 返回值
 */
export interface UseZoneRegistrationReturn {
  /**
   * 綁定到元素的 ref
   */
  elementRef: Ref<HTMLElement | null>

  /**
   * 手動註冊（若 autoRegister 為 false）
   */
  register: () => void

  /**
   * 手動取消註冊
   */
  unregister: () => void

  /**
   * 是否已註冊
   */
  isRegistered: Ref<boolean>
}

/**
 * 區域註冊 Composable
 *
 * @param zoneName - 區域名稱
 * @param options - 選項
 * @returns Composable 返回值
 *
 * @example
 * ```vue
 * <script setup>
 * const { elementRef } = useZoneRegistration('player-hand')
 * </script>
 *
 * <template>
 *   <div ref="elementRef" class="player-hand">
 *     <!-- cards -->
 *   </div>
 * </template>
 * ```
 */
export function useZoneRegistration(
  zoneName: ZoneName,
  options: UseZoneRegistrationOptions = {}
): UseZoneRegistrationReturn {
  const { autoRegister = true } = options

  const elementRef = ref<HTMLElement | null>(null)
  const isRegistered = ref(false)

  const register = () => {
    if (elementRef.value && !isRegistered.value) {
      zoneRegistry.register(zoneName, elementRef.value)
      isRegistered.value = true
    }
  }

  const unregister = () => {
    if (isRegistered.value) {
      zoneRegistry.unregister(zoneName)
      isRegistered.value = false
    }
  }

  onMounted(() => {
    if (autoRegister) {
      register()
    }
  })

  onUnmounted(() => {
    unregister()
  })

  return {
    elementRef,
    register,
    unregister,
    isRegistered,
  }
}
