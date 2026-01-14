/**
 * TelegramInitDataValidator
 *
 * @description
 * Telegram Mini App initData 驗證器（Adapter Layer）。
 * 負責驗證 Telegram WebApp 傳入的 initData 簽名，並轉換為 ExternalUserInfo。
 *
 * 驗證流程依據 Telegram 官方文件：
 * @see https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */

import { createHmac } from 'crypto'
import type { ExternalUserInfo } from '../../application/ports/input/external-user-info'

// =============================================================================
// Types
// =============================================================================

/**
 * Telegram WebApp 使用者資訊
 */
export interface TelegramUser {
  /** Telegram 使用者 ID */
  id: number
  /** 名字 */
  first_name: string
  /** 姓氏（可選） */
  last_name?: string
  /** Telegram username（可選） */
  username?: string
  /** 語言代碼（可選） */
  language_code?: string
  /** 是否為 Premium 用戶（可選） */
  is_premium?: boolean
  /** 頭像 URL（可選） */
  photo_url?: string
}

/**
 * initData 解析結果（內部使用）
 */
interface _ParsedInitData {
  user: TelegramUser
  authDate: number
  hash: string
  queryId?: string
  startParam?: string
}

/**
 * 驗證結果
 */
export type TelegramValidationResult =
  | { valid: true; userInfo: ExternalUserInfo; telegramUser: TelegramUser }
  | { valid: false; error: string }

// =============================================================================
// Constants
// =============================================================================

/** initData 有效期限（1 小時，開發階段放寬） */
const INIT_DATA_TTL_SECONDS = 3600

// =============================================================================
// Validator Class
// =============================================================================

/**
 * Telegram initData 驗證器
 */
export class TelegramInitDataValidator {
  constructor(private readonly botToken: string) {
    if (!botToken) {
      throw new Error('Telegram bot token is required')
    }
  }

  /**
   * 驗證 initData 並轉換為 ExternalUserInfo
   *
   * @param initDataString 原始 initData 字串（URL encoded）
   * @returns 驗證結果
   */
  validate(initDataString: string): TelegramValidationResult {
    try {
      // 1. 解析 initData
      const params = new URLSearchParams(initDataString)
      const hash = params.get('hash')

      if (!hash) {
        return { valid: false, error: 'Missing hash parameter' }
      }

      // 2. 建立 data-check-string
      params.delete('hash')
      const dataCheckString = Array.from(params.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join('\n')

      // 3. 計算 HMAC-SHA256
      // secret_key = HMAC-SHA256(bot_token, "WebAppData")
      const secretKey = createHmac('sha256', 'WebAppData')
        .update(this.botToken)
        .digest()

      // calculated_hash = HMAC-SHA256(data_check_string, secret_key)
      const calculatedHash = createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex')

      // 4. 比較 hash（使用 timing-safe 比較）
      if (!this.timingSafeEqual(calculatedHash, hash)) {
        return { valid: false, error: 'Invalid hash signature' }
      }

      // 5. 檢查 auth_date 是否過期
      const authDateStr = params.get('auth_date')
      if (!authDateStr) {
        return { valid: false, error: 'Missing auth_date' }
      }

      const authDate = parseInt(authDateStr, 10)
      const now = Math.floor(Date.now() / 1000)
      const age = now - authDate

      if (age > INIT_DATA_TTL_SECONDS) {
        return { valid: false, error: `initData expired (age: ${age}s, TTL: ${INIT_DATA_TTL_SECONDS}s)` }
      }

      // 6. 解析 user
      const userStr = params.get('user')
      if (!userStr) {
        return { valid: false, error: 'Missing user data' }
      }

      const telegramUser: TelegramUser = JSON.parse(userStr)

      // 7. 轉換為 ExternalUserInfo
      const userInfo = this.toExternalUserInfo(telegramUser)

      return {
        valid: true,
        userInfo,
        telegramUser,
      }
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Validation failed',
      }
    }
  }

  /**
   * 將 TelegramUser 轉換為 ExternalUserInfo
   */
  private toExternalUserInfo(telegramUser: TelegramUser): ExternalUserInfo {
    return {
      provider: 'telegram',
      providerUserId: String(telegramUser.id),
      email: null, // Telegram 不提供 email
      displayName: this.generateDisplayName(telegramUser),
    }
  }

  /**
   * 產生顯示名稱
   */
  private generateDisplayName(user: TelegramUser): string {
    // 優先使用 username
    if (user.username) {
      return user.username
    }
    // 其次使用 first_name + last_name
    const name = [user.first_name, user.last_name].filter(Boolean).join(' ')
    return name || `tg_${user.id}`
  }

  /**
   * Timing-safe 字串比較（防止 timing attack）
   */
  private timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false
    }

    let result = 0
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i)
    }
    return result === 0
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * 建立 Telegram initData 驗證器
 *
 * @returns TelegramInitDataValidator 實例
 * @throws 當 TELEGRAM_BOT_TOKEN 未設定時拋出錯誤
 */
export function createTelegramValidator(): TelegramInitDataValidator {
  const botToken = process.env.TELEGRAM_BOT_TOKEN

  if (!botToken) {
    throw new Error('TELEGRAM_BOT_TOKEN environment variable is not configured')
  }

  return new TelegramInitDataValidator(botToken)
}
