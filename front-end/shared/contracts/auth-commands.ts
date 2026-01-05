/**
 * Identity BC - Auth Commands
 *
 * 認證相關的命令類型定義
 */

import type {
  RegisterRequest,
  LoginRequest,
  LinkAccountRequest,
  DeleteAccountRequest,
  OAuthProvider,
} from './identity-types'

// =============================================================================
// Command Types
// =============================================================================

/**
 * 註冊命令
 */
export interface RegisterCommand extends RegisterRequest {
  /** 當前的訪客 Player ID（若有，用於資料遷移） */
  guestPlayerId?: string
}

/**
 * 登入命令
 */
export interface LoginCommand extends LoginRequest {}

/**
 * 登出命令
 */
export interface LogoutCommand {
  /** Session ID（從 Cookie 取得） */
  sessionId: string
}

/**
 * 建立訪客命令（無參數，系統自動生成）
 */
export type CreateGuestCommand = Record<string, never>

/**
 * OAuth 登入開始命令
 */
export interface OAuthStartCommand {
  /** OAuth Provider */
  provider: OAuthProvider
  /** 授權完成後的導向 URI */
  redirectUri?: string
}

/**
 * OAuth 回調命令
 */
export interface OAuthCallbackCommand {
  /** OAuth Provider */
  provider: OAuthProvider
  /** 授權碼 */
  code: string
  /** 狀態驗證碼 */
  state: string
}

/**
 * 連結帳號命令
 */
export interface LinkAccountCommand extends LinkAccountRequest {}

/**
 * 刪除帳號命令
 */
export interface DeleteAccountCommand extends DeleteAccountRequest {
  /** Session ID（從 Cookie 取得） */
  sessionId: string
}

// =============================================================================
// Command Result Types
// =============================================================================

/**
 * 命令執行結果基礎類型
 */
export type CommandResult<T, E = string> =
  | { success: true; data: T }
  | { success: false; error: E; message: string }

/**
 * 認證命令錯誤類型
 */
export type AuthError =
  | 'VALIDATION_ERROR'
  | 'CONFLICT'
  | 'UNAUTHORIZED'
  | 'NOT_FOUND'
  | 'OAUTH_ERROR'
  | 'INTERNAL_ERROR'
  | 'INVALID_CREDENTIALS'
  | 'ALREADY_EXISTS'
