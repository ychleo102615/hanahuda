/**
 * Identity BC - Shared Types
 *
 * 這些型別定義用於前後端共用
 */

// =============================================================================
// Player Types
// =============================================================================

/**
 * 玩家資訊（用於 API 回應）
 */
export interface PlayerInfo {
  /** Player UUID */
  id: string
  /** 顯示名稱（訪客: Guest_XXXX, 註冊: 帳號名稱） */
  displayName: string
  /** 是否為訪客 */
  isGuest: boolean
  /** 是否已認證（有有效 Session） */
  isAuthenticated: boolean
}

// =============================================================================
// Auth Request Types
// =============================================================================

/**
 * 註冊請求
 */
export interface RegisterRequest {
  /** 帳號名稱（3-20字元，英文字母、數字、底線） */
  username: string
  /** 密碼（至少8字元，包含字母與數字） */
  password: string
  /** 確認密碼 */
  confirmPassword: string
  /** Email（選填） */
  email?: string
}

/**
 * 登入請求
 */
export interface LoginRequest {
  /** 帳號名稱 */
  username: string
  /** 密碼 */
  password: string
}

/**
 * 連結帳號請求
 */
export interface LinkAccountRequest {
  /** 現有帳號的密碼（用於驗證） */
  password: string
  /** OAuth Provider */
  oauthProvider: OAuthProvider
  /** OAuth 暫存 Token（由 callback 返回） */
  oauthToken: string
}

// =============================================================================
// Auth Response Types
// =============================================================================

/**
 * 認證回應
 */
export interface AuthResponse {
  /** 玩家資訊 */
  player: PlayerInfo
  /** 訊息 */
  message?: string
}

/**
 * 登出回應
 */
export interface LogoutResponse {
  success: boolean
}

// =============================================================================
// Error Types
// =============================================================================

/**
 * 驗證錯誤
 */
export interface ValidationError {
  error: 'VALIDATION_ERROR'
  message: string
  details: ValidationErrorDetail[]
}

export interface ValidationErrorDetail {
  field: string
  message: string
}

/**
 * 衝突錯誤（如帳號已存在）
 */
export interface ConflictError {
  error: 'CONFLICT'
  message: string
}

/**
 * 未授權錯誤
 */
export interface UnauthorizedError {
  error: 'UNAUTHORIZED'
  message: string
}

// =============================================================================
// OAuth Types
// =============================================================================

/**
 * 支援的 OAuth Provider
 */
export type OAuthProvider = 'google' | 'line'

/**
 * OAuth 回調參數
 */
export interface OAuthCallbackParams {
  code: string
  state: string
}

/**
 * OAuth 連結結果
 */
export type OAuthLinkResult =
  | { type: 'LOGGED_IN'; player: PlayerInfo }
  | { type: 'NEW_ACCOUNT'; player: PlayerInfo }
  | { type: 'LINK_PROMPT'; existingUsername: string; oauthToken: string }

// =============================================================================
// Validation Rules (for frontend & backend)
// =============================================================================

export const VALIDATION_RULES = {
  username: {
    minLength: 3,
    maxLength: 20,
    pattern: /^[a-zA-Z0-9_]+$/,
    patternMessage: 'Username can only contain letters, numbers, and underscores',
  },
  password: {
    minLength: 8,
    pattern: /^(?=.*[a-zA-Z])(?=.*[0-9]).+$/,
    patternMessage: 'Password must contain at least one letter and one number',
  },
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    patternMessage: 'Invalid email format',
  },
  displayName: {
    maxLength: 50,
  },
} as const

// =============================================================================
// Cookie Names
// =============================================================================

export const COOKIE_NAMES = {
  SESSION: 'session_id',
  GUEST: 'guest_token',
  SKIP_REGISTER_PROMPT: 'skip_register_prompt',
} as const

// =============================================================================
// Session Configuration
// =============================================================================

export const SESSION_CONFIG = {
  /** Session 有效期（秒）- 7 天 */
  MAX_AGE: 7 * 24 * 60 * 60,
  /** 滑動過期 - 每次請求延長 */
  SLIDING: true,
} as const

export const GUEST_CONFIG = {
  /** Guest Cookie 有效期（秒）- 30 天 */
  MAX_AGE: 30 * 24 * 60 * 60,
} as const
