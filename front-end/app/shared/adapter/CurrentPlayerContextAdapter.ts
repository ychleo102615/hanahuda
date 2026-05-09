/**
 * CurrentPlayerContextAdapter
 *
 * @description
 * CurrentPlayerContextPort 的實作，包裝 Identity BC 的 AuthStore。
 *
 * 此 Adapter 位於 Shared Kernel，可被任何 BC 使用。
 */

import type { CurrentPlayerContextPort, CurrentPlayerContext } from '../ports'
import { useAuthStore } from '~/identity/adapter/stores/auth-store'

export class CurrentPlayerContextAdapter implements CurrentPlayerContextPort {
  getContext(): CurrentPlayerContext {
    const authStore = useAuthStore()

    return {
      playerId: authStore.playerId,
      isLoggedIn: authStore.isLoggedIn,
    }
  }
}

/**
 * 建立 CurrentPlayerContextAdapter 實例
 *
 * @returns CurrentPlayerContextPort 實例
 */
export function createCurrentPlayerContextAdapter(): CurrentPlayerContextPort {
  return new CurrentPlayerContextAdapter()
}
