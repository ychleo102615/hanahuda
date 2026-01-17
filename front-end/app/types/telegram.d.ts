/**
 * Telegram WebApp SDK 型別宣告
 *
 * @description
 * Telegram Mini App WebApp SDK 的 TypeScript 型別定義。
 * 擴展 Window 介面以支援 Telegram 注入的 WebApp 物件。
 *
 * @see https://core.telegram.org/bots/webapps#initializing-mini-apps
 */

// =============================================================================
// User Types
// =============================================================================

/**
 * Telegram 使用者資訊
 */
interface TelegramWebAppUser {
  /** Telegram 使用者 ID */
  id: number
  /** 名字 */
  first_name: string
  /** 姓氏（可選） */
  last_name?: string
  /** Telegram username（可選，不含 @） */
  username?: string
  /** IETF 語言標籤（可選） */
  language_code?: string
  /** 是否為 Premium 用戶（可選） */
  is_premium?: boolean
  /** 是否允許寫入私訊（可選） */
  allows_write_to_pm?: boolean
  /** 頭像 URL（可選） */
  photo_url?: string
}

/**
 * Telegram 聊天資訊
 */
interface TelegramWebAppChat {
  /** 聊天 ID */
  id: number
  /** 聊天類型 */
  type: 'group' | 'supergroup' | 'channel'
  /** 聊天標題 */
  title: string
  /** 聊天 username（可選） */
  username?: string
  /** 聊天頭像 URL（可選） */
  photo_url?: string
}

// =============================================================================
// Theme Types
// =============================================================================

/**
 * Telegram 主題參數
 */
interface TelegramThemeParams {
  /** 背景色 */
  bg_color?: string
  /** 文字色 */
  text_color?: string
  /** 提示文字色 */
  hint_color?: string
  /** 連結色 */
  link_color?: string
  /** 按鈕色 */
  button_color?: string
  /** 按鈕文字色 */
  button_text_color?: string
  /** 次要背景色 */
  secondary_bg_color?: string
  /** Header 背景色 */
  header_bg_color?: string
  /** 強調文字色 */
  accent_text_color?: string
  /** 區段背景色 */
  section_bg_color?: string
  /** 區段 Header 文字色 */
  section_header_text_color?: string
  /** 副標題文字色 */
  subtitle_text_color?: string
  /** 解構文字色 */
  destructive_text_color?: string
}

// =============================================================================
// Button Types
// =============================================================================

/**
 * Main Button
 */
interface TelegramMainButton {
  /** 按鈕文字 */
  text: string
  /** 按鈕顏色 */
  color: string
  /** 文字顏色 */
  textColor: string
  /** 是否可見 */
  isVisible: boolean
  /** 是否啟用 */
  isActive: boolean
  /** 是否顯示載入中 */
  isProgressVisible: boolean
  /** 設定按鈕文字 */
  setText(text: string): TelegramMainButton
  /** 顯示按鈕 */
  show(): TelegramMainButton
  /** 隱藏按鈕 */
  hide(): TelegramMainButton
  /** 啟用按鈕 */
  enable(): TelegramMainButton
  /** 停用按鈕 */
  disable(): TelegramMainButton
  /** 顯示載入中狀態 */
  showProgress(leaveActive?: boolean): TelegramMainButton
  /** 隱藏載入中狀態 */
  hideProgress(): TelegramMainButton
  /** 設定點擊事件處理器 */
  onClick(callback: () => void): TelegramMainButton
  /** 移除點擊事件處理器 */
  offClick(callback: () => void): TelegramMainButton
  /** 設定按鈕參數 */
  setParams(params: {
    text?: string
    color?: string
    text_color?: string
    is_active?: boolean
    is_visible?: boolean
  }): TelegramMainButton
}

/**
 * Back Button
 */
interface TelegramBackButton {
  /** 是否可見 */
  isVisible: boolean
  /** 顯示按鈕 */
  show(): TelegramBackButton
  /** 隱藏按鈕 */
  hide(): TelegramBackButton
  /** 設定點擊事件處理器 */
  onClick(callback: () => void): TelegramBackButton
  /** 移除點擊事件處理器 */
  offClick(callback: () => void): TelegramBackButton
}

// =============================================================================
// Haptic Feedback
// =============================================================================

/**
 * Haptic Feedback
 */
interface TelegramHapticFeedback {
  /** 觸覺衝擊回饋 */
  impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): TelegramHapticFeedback
  /** 通知回饋 */
  notificationOccurred(type: 'error' | 'success' | 'warning'): TelegramHapticFeedback
  /** 選擇變更回饋 */
  selectionChanged(): TelegramHapticFeedback
}

// =============================================================================
// Popup Types
// =============================================================================

/**
 * Popup 參數
 */
interface TelegramPopupParams {
  /** 標題（可選，0-64 字元） */
  title?: string
  /** 訊息（1-256 字元） */
  message: string
  /** 按鈕（1-3 個） */
  buttons?: TelegramPopupButton[]
}

/**
 * Popup 按鈕
 */
interface TelegramPopupButton {
  /** 按鈕 ID */
  id?: string
  /** 按鈕類型 */
  type?: 'default' | 'ok' | 'close' | 'cancel' | 'destructive'
  /** 按鈕文字 */
  text?: string
}

// =============================================================================
// WebApp Main Interface
// =============================================================================

/**
 * Telegram WebApp 主介面
 */
interface TelegramWebApp {
  /** 原始 initData 字串 */
  initData: string
  /** 解析後的 initData（不安全，僅供前端使用） */
  initDataUnsafe: {
    query_id?: string
    user?: TelegramWebAppUser
    receiver?: TelegramWebAppUser
    chat?: TelegramWebAppChat
    chat_type?: 'sender' | 'private' | 'group' | 'supergroup' | 'channel'
    chat_instance?: string
    start_param?: string
    can_send_after?: number
    auth_date?: number
    hash?: string
  }
  /** WebApp 版本 */
  version: string
  /** 平台 */
  platform: string
  /** 色彩方案 */
  colorScheme: 'light' | 'dark'
  /** 主題參數 */
  themeParams: TelegramThemeParams
  /** 是否已展開 */
  isExpanded: boolean
  /** 視窗高度 */
  viewportHeight: number
  /** 穩定視窗高度 */
  viewportStableHeight: number
  /** Header 顏色 */
  headerColor: string
  /** 背景顏色 */
  backgroundColor: string
  /** 是否關閉確認啟用 */
  isClosingConfirmationEnabled: boolean

  // =========================================================================
  // Methods
  // =========================================================================

  /** 通知 Telegram WebApp 已準備就緒 */
  ready(): void
  /** 展開 WebApp */
  expand(): void
  /** 關閉 WebApp */
  close(): void

  /** 設定 Header 顏色 */
  setHeaderColor(color: 'bg_color' | 'secondary_bg_color' | string): void
  /** 設定背景顏色 */
  setBackgroundColor(color: 'bg_color' | 'secondary_bg_color' | string): void

  /** 啟用關閉確認 */
  enableClosingConfirmation(): void
  /** 停用關閉確認 */
  disableClosingConfirmation(): void

  /** 顯示 Alert */
  showAlert(message: string, callback?: () => void): void
  /** 顯示 Confirm */
  showConfirm(message: string, callback?: (confirmed: boolean) => void): void
  /** 顯示 Popup */
  showPopup(params: TelegramPopupParams, callback?: (buttonId: string) => void): void

  /** 開啟連結 */
  openLink(url: string, options?: { try_instant_view?: boolean }): void
  /** 開啟 Telegram 連結 */
  openTelegramLink(url: string): void
  /** 開啟發票 */
  openInvoice(url: string, callback?: (status: 'paid' | 'cancelled' | 'failed' | 'pending') => void): void

  /** 切換全螢幕 */
  requestFullscreen(): void
  /** 退出全螢幕 */
  exitFullscreen(): void

  // =========================================================================
  // Sub-objects
  // =========================================================================

  /** Main Button */
  MainButton: TelegramMainButton
  /** Back Button */
  BackButton: TelegramBackButton
  /** Haptic Feedback */
  HapticFeedback: TelegramHapticFeedback

  // =========================================================================
  // Events
  // =========================================================================

  /** 訂閱事件 */
  onEvent(eventType: string, eventHandler: () => void): void
  /** 取消訂閱事件 */
  offEvent(eventType: string, eventHandler: () => void): void

  /** 傳送資料給 Bot */
  sendData(data: string): void
}

// =============================================================================
// Window Extension
// =============================================================================

/**
 * 擴展 Window 介面
 */
declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp
    }
  }
}

export {}
