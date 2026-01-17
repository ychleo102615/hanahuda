/**
 * TelegramAuthAdapter
 *
 * @description
 * Telegram 認證 API Adapter。
 * 實作 TelegramAuthPort，透過 $fetch 呼叫後端 API。
 *
 * @module app/game-client/adapter/api/TelegramAuthAdapter
 */

import type { TelegramAuthPort, TelegramAuthResult } from '../../application/ports/output/telegram-auth.port'

// =============================================================================
// Types
// =============================================================================

/**
 * API Response 型別
 */
interface TelegramVerifyApiResponse {
  type: 'LOGGED_IN' | 'NEW_ACCOUNT' | 'AUTO_LINKED'
  player: {
    id: string
    displayName: string
    isGuest: boolean
    isAuthenticated: boolean
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * 從 FetchError 中提取錯誤訊息
 */
function extractErrorMessage(error: unknown): string {
  // Check if it's a FetchError with response data
  if (
    error &&
    typeof error === 'object' &&
    'data' in error &&
    error.data &&
    typeof error.data === 'object'
  ) {
    const data = error.data as { message?: string }
    if (data.message) {
      return data.message
    }
  }

  // Check if it's a standard Error
  if (error instanceof Error) {
    return error.message
  }

  return 'Telegram authentication failed'
}

// =============================================================================
// Adapter Class
// =============================================================================

/**
 * Telegram 認證 Adapter
 *
 * 實作 TelegramAuthPort，負責與後端 API 溝通
 */
export class TelegramAuthAdapter implements TelegramAuthPort {
  /**
   * 驗證 Telegram initData 並執行登入
   *
   * @param initData Telegram WebApp initData 字串
   * @returns 認證結果
   */
  async verify(initData: string): Promise<TelegramAuthResult> {
    try {
      const response = await $fetch<TelegramVerifyApiResponse>('/api/v1/auth/telegram/verify', {
        method: 'POST',
        body: { initData },
      })

      return {
        success: true,
        type: response.type,
        player: response.player,
      }
    } catch (error) {
      return {
        success: false,
        error: extractErrorMessage(error),
      }
    }
  }
}

// =============================================================================
// Singleton
// =============================================================================

let instance: TelegramAuthAdapter | null = null

/**
 * 取得 TelegramAuthAdapter 單例
 */
export function getTelegramAuthAdapter(): TelegramAuthAdapter {
  if (!instance) {
    instance = new TelegramAuthAdapter()
  }
  return instance
}
