/**
 * TelegramSdkClient
 *
 * @description
 * Telegram WebApp SDK Client。
 * 封裝 Telegram WebApp SDK 操作，提供統一的介面給應用程式使用。
 *
 * 注意：這是工具類（SDK 封裝），不是 Clean Architecture 中的 Adapter。
 * 命名為 Client 以避免與 Ports & Adapters 模式混淆。
 *
 * SDK 載入策略：
 * - 不在 nuxt.config.ts 預載入 telegram-web-app.js
 * - 依賴 Telegram 客戶端自動注入 window.Telegram 物件
 * - 避免在非 Telegram 環境產生 SDK 的 debug console 輸出
 *
 * @module app/game-client/adapter/telegram/TelegramSdkClient
 */

// =============================================================================
// Types
// =============================================================================

/**
 * 從 window.Telegram.WebApp 取得型別
 */
type TelegramWebApp = NonNullable<Window['Telegram']>['WebApp']

/**
 * Telegram 環境資訊
 */
export interface TelegramEnvironment {
  /** 是否在 Telegram Mini App 環境內 */
  isInTelegram: boolean
  /** initData 字串（用於後端驗證） */
  initData: string | null
  /** 平台資訊 */
  platform: string | null
  /** WebApp 版本 */
  version: string | null
  /** 色彩方案 */
  colorScheme: 'light' | 'dark' | null
}

/**
 * Telegram 使用者資訊（從 initDataUnsafe 取得，僅供 UI 使用）
 */
export interface TelegramUserInfo {
  /** 使用者 ID */
  id: number
  /** 名字 */
  firstName: string
  /** 姓氏 */
  lastName?: string
  /** Username */
  username?: string
  /** 語言代碼 */
  languageCode?: string
  /** 是否為 Premium 用戶 */
  isPremium?: boolean
}

// =============================================================================
// Adapter Class
// =============================================================================

/**
 * Telegram SDK Adapter
 *
 * 封裝 Telegram WebApp SDK，提供以下功能：
 * - 環境檢測
 * - SDK 初始化
 * - Haptic Feedback
 * - Alert/Confirm 對話框
 * - 主題設定
 */
export class TelegramSdkClient {
  private webApp: TelegramWebApp | null = null
  private _isInitialized = false

  /**
   * 檢測並初始化 Telegram 環境
   *
   * @returns Telegram 環境資訊
   */
  initialize(): TelegramEnvironment {
    // 檢查是否在 Telegram 環境內
    const isInTelegram = this.checkTelegramEnvironment()

    if (!isInTelegram) {
      return {
        isInTelegram: false,
        initData: null,
        platform: null,
        version: null,
        colorScheme: null,
      }
    }

    // 取得 WebApp 實例
    this.webApp = window.Telegram!.WebApp
    this._isInitialized = true

    // 通知 Telegram 已準備就緒
    this.webApp.ready()

    // 展開 Mini App
    this.webApp.expand()

    return {
      isInTelegram: true,
      initData: this.webApp.initData || null,
      platform: this.webApp.platform || null,
      version: this.webApp.version || null,
      colorScheme: this.webApp.colorScheme || null,
    }
  }

  /**
   * 檢查是否在 Telegram 環境內
   */
  private checkTelegramEnvironment(): boolean {
    if (typeof window === 'undefined') {
      return false
    }

    return Boolean(
      window.Telegram?.WebApp?.initData &&
      window.Telegram.WebApp.initData.length > 0
    )
  }

  /**
   * 取得 initData 字串
   */
  getInitData(): string | null {
    return this.webApp?.initData || null
  }

  /**
   * 取得使用者資訊（僅供 UI 使用，不可信任）
   */
  getUserInfo(): TelegramUserInfo | null {
    const user = this.webApp?.initDataUnsafe?.user
    if (!user) {
      return null
    }

    return {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      username: user.username,
      languageCode: user.language_code,
      isPremium: user.is_premium,
    }
  }

  /**
   * 是否在 Telegram 環境內
   */
  isInTelegramEnv(): boolean {
    return this._isInitialized && this.webApp !== null
  }

  // =========================================================================
  // Theme Methods
  // =========================================================================

  /**
   * 設定 Header 顏色
   */
  setHeaderColor(color: string): void {
    this.webApp?.setHeaderColor(color)
  }

  /**
   * 設定背景顏色
   */
  setBackgroundColor(color: string): void {
    this.webApp?.setBackgroundColor(color)
  }

  /**
   * 取得目前色彩方案
   */
  getColorScheme(): 'light' | 'dark' | null {
    return this.webApp?.colorScheme || null
  }

  // =========================================================================
  // Haptic Feedback
  // =========================================================================

  /**
   * 觸覺衝擊回饋
   */
  impactFeedback(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void {
    this.webApp?.HapticFeedback.impactOccurred(style)
  }

  /**
   * 成功回饋
   */
  successFeedback(): void {
    this.webApp?.HapticFeedback.notificationOccurred('success')
  }

  /**
   * 錯誤回饋
   */
  errorFeedback(): void {
    this.webApp?.HapticFeedback.notificationOccurred('error')
  }

  /**
   * 警告回饋
   */
  warningFeedback(): void {
    this.webApp?.HapticFeedback.notificationOccurred('warning')
  }

  /**
   * 選擇變更回饋
   */
  selectionFeedback(): void {
    this.webApp?.HapticFeedback.selectionChanged()
  }

  // =========================================================================
  // Dialog Methods
  // =========================================================================

  /**
   * 顯示 Alert 對話框
   */
  showAlert(message: string): Promise<void> {
    return new Promise((resolve) => {
      if (this.webApp) {
        this.webApp.showAlert(message, resolve)
      } else {
        // Fallback to native alert
        alert(message)
        resolve()
      }
    })
  }

  /**
   * 顯示 Confirm 對話框
   */
  showConfirm(message: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.webApp) {
        this.webApp.showConfirm(message, resolve)
      } else {
        // Fallback to native confirm
        resolve(confirm(message))
      }
    })
  }

  // =========================================================================
  // Lifecycle Methods
  // =========================================================================

  /**
   * 啟用關閉確認
   */
  enableClosingConfirmation(): void {
    this.webApp?.enableClosingConfirmation()
  }

  /**
   * 停用關閉確認
   */
  disableClosingConfirmation(): void {
    this.webApp?.disableClosingConfirmation()
  }

  /**
   * 關閉 Mini App
   */
  close(): void {
    this.webApp?.close()
  }
}

// =============================================================================
// Singleton
// =============================================================================

let instance: TelegramSdkClient | null = null

/**
 * 取得 TelegramSdkClient 單例
 */
export function getTelegramSdkClient(): TelegramSdkClient {
  if (!instance) {
    instance = new TelegramSdkClient()
  }
  return instance
}
