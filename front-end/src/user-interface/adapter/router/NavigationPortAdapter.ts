/**
 * NavigationPortAdapter - Vue Router 適配器
 *
 * @description
 * 實作 NavigationPort 介面，將導航操作委派給 Vue Router。
 *
 * @location front-end/src/user-interface/adapter/router/NavigationPortAdapter.ts
 */

import type { NavigationPort } from '@/user-interface/application/ports/output'
import router from '@/router'

/**
 * 創建 NavigationPort 適配器
 *
 * @returns NavigationPort 實作
 */
export function createNavigationPortAdapter(): NavigationPort {
  return {
    navigateToLobby(): void {
      router.push({ name: 'lobby' })
    },

    navigateToGame(): void {
      router.push({ name: 'game' })
    },

    navigateToHome(): void {
      router.push({ name: 'home' })
    },
  }
}
