/**
 * TelegramAuthPort - Output Port
 *
 * @description
 * Telegram 認證操作的 Output Port。
 * Application Layer 透過此 Port 執行 Telegram 認證，
 * 不知道底層是用 $fetch、axios 還是其他 HTTP 客戶端。
 *
 * @example
 * ```typescript
 * // Adapter Layer 實作
 * class TelegramAuthAdapter implements TelegramAuthPort {
 *   async verify(initData: string): Promise<TelegramAuthResult> {
 *     const response = await $fetch('/api/v1/auth/telegram/verify', {
 *       method: 'POST',
 *       body: { initData },
 *     })
 *     return { success: true, player: response.player }
 *   }
 * }
 * ```
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Telegram 認證結果中的玩家資訊
 */
export interface TelegramAuthPlayer {
  /** 玩家 ID */
  id: string
  /** 顯示名稱 */
  displayName: string
  /** 是否為訪客 */
  isGuest: boolean
  /** 是否已認證 */
  isAuthenticated: boolean
}

/**
 * Telegram 認證結果
 */
export type TelegramAuthResult =
  | {
      success: true
      /** 登入類型 */
      type: 'LOGGED_IN' | 'NEW_ACCOUNT' | 'AUTO_LINKED'
      /** 玩家資訊 */
      player: TelegramAuthPlayer
    }
  | {
      success: false
      /** 錯誤訊息 */
      error: string
    }

// =============================================================================
// Port Interface
// =============================================================================

/**
 * Telegram 認證 Port
 */
export interface TelegramAuthPort {
  /**
   * 驗證 Telegram initData 並執行登入
   *
   * @param initData Telegram WebApp initData 字串
   * @returns 認證結果
   */
  verify(initData: string): Promise<TelegramAuthResult>
}
