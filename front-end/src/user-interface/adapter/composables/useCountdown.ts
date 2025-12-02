/**
 * useCountdown Composable
 *
 * @description
 * Vue composable 包裝 CountdownManager，提供 Vue 生命週期整合。
 * 組件卸載時自動清理倒數計時。
 *
 * 使用方式:
 * ```typescript
 * const countdown = useCountdown()
 * countdown.startActionCountdown(30)
 * // 組件卸載時自動清理
 * ```
 */

import { onUnmounted } from 'vue'
import { useUIStateStore } from '../stores/uiState'
import { CountdownManager } from '../services/CountdownManager'

export function useCountdown() {
  const uiState = useUIStateStore()
  const manager = new CountdownManager(uiState)

  // 自動清理（當 composable 所在的組件卸載時）
  onUnmounted(() => {
    manager.cleanup()
  })

  return manager
}
