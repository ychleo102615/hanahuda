/**
 * NavigationPortAdapter - Nuxt Router 適配器
 *
 * @description
 * 實作 NavigationPort 介面，將導航操作委派給 Nuxt Router（使用 navigateTo）。
 *
 * @location front-end/src/user-interface/adapter/router/NavigationPortAdapter.ts
 */

import type { NavigationPort } from '~/user-interface/application/ports/output'

/**
 * 創建 NavigationPort 適配器
 *
 * @returns NavigationPort 實作
 */
export function createNavigationPortAdapter(): NavigationPort {
  return {
    navigateToLobby(): void {
      navigateTo('/lobby')
    },

    navigateToGame(): void {
      navigateTo('/game')
    },

    navigateToHome(): void {
      navigateTo('/')
    },
  }
}
