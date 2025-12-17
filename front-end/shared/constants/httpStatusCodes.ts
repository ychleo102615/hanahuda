/**
 * HTTP 狀態碼常數
 *
 * @description
 * 定義後端 API 使用的所有 HTTP 狀態碼。
 * 作為 Single Source of Truth (SSOT)，前後端共用。
 *
 * 參考: doc/shared/http-status-codes.md
 *
 * @module shared/constants/httpStatusCodes
 */

// ============================================================================
// 成功狀態碼 (2xx)
// ============================================================================

/**
 * 200 OK - 請求成功
 *
 * @description
 * 使用場景：
 * - 遊戲重連成功
 * - 快照取得成功
 * - 遊戲操作成功（打牌、選擇配對目標、決策、確認繼續、離開）
 * - SSE 連線建立成功
 */
export const HTTP_OK = 200

/**
 * 201 Created - 資源建立成功
 *
 * @description
 * 使用場景：
 * - 新遊戲建立成功
 * - 玩家首次加入遊戲（非重連）
 */
export const HTTP_CREATED = 201

// ============================================================================
// 客戶端錯誤狀態碼 (4xx)
// ============================================================================

/**
 * 400 Bad Request - 請求參數驗證失敗
 *
 * @description
 * 使用場景：
 * - 請求 Body 格式錯誤（缺少必填欄位、類型不符）
 * - 路由參數驗證失敗
 * - Query 參數驗證失敗
 *
 * 錯誤代碼：VALIDATION_ERROR | MISSING_GAME_ID
 */
export const HTTP_BAD_REQUEST = 400

/**
 * 401 Unauthorized - 身份驗證失敗
 *
 * @description
 * 使用場景：
 * - 缺少 HttpOnly Cookie 中的 session_token
 * - Session token 無效或已過期
 *
 * 錯誤代碼：MISSING_TOKEN | INVALID_SESSION
 */
export const HTTP_UNAUTHORIZED = 401

/**
 * 403 Forbidden - 授權失敗
 *
 * @description
 * 使用場景：
 * - 玩家嘗試存取不屬於自己的遊戲會話
 * - Session token 與 gameId 不匹配
 *
 * 錯誤代碼：GAME_MISMATCH
 */
export const HTTP_FORBIDDEN = 403

/**
 * 404 Not Found - 資源不存在
 *
 * @description
 * 使用場景：
 * - 遊戲 ID 無效
 * - 遊戲已被刪除
 *
 * 錯誤代碼：GAME_NOT_FOUND
 */
export const HTTP_NOT_FOUND = 404

/**
 * 409 Conflict - 狀態衝突
 *
 * @description
 * 使用場景：
 * - 遊戲尚未開始（仍在 WAITING 狀態）
 * - 遊戲已結束
 * - 操作與當前遊戲狀態衝突
 * - 不需要進行該操作的狀態
 *
 * 錯誤代碼：GAME_NOT_STARTED | GAME_ALREADY_FINISHED | CONFIRMATION_NOT_REQUIRED
 */
export const HTTP_CONFLICT = 409

/**
 * 410 Gone - 資源已過期
 *
 * @description
 * 使用場景：
 * - 遊戲存在於資料庫但不在記憶體中
 * - 無法恢復完整遊戲狀態
 *
 * 錯誤代碼：GAME_EXPIRED
 */
export const HTTP_GONE = 410

/**
 * 429 Too Many Requests - 超過速率限制
 *
 * @description
 * 使用場景：
 * - 客戶端超過 API 速率限制
 *
 * 速率限制規則：
 * - Join: 10 requests/minute
 * - Turns/Rounds: 60 requests/minute
 *
 * 錯誤代碼：RATE_LIMIT_EXCEEDED
 */
export const HTTP_TOO_MANY_REQUESTS = 429

// ============================================================================
// 伺服器錯誤狀態碼 (5xx)
// ============================================================================

/**
 * 500 Internal Server Error - 伺服器內部錯誤
 *
 * @description
 * 使用場景：
 * - 未捕捉的例外錯誤
 * - 內部邏輯錯誤
 * - 資料庫操作失敗
 * - 找不到人類玩家（內部狀態異常）
 *
 * 錯誤代碼：INTERNAL_ERROR | PLAYER_NOT_FOUND
 */
export const HTTP_INTERNAL_SERVER_ERROR = 500

// ============================================================================
// API 錯誤代碼常數
// ============================================================================

/**
 * API 錯誤代碼
 *
 * @description
 * 與 HTTP 狀態碼配合使用的錯誤代碼。
 * 用於 error response 的 code 欄位。
 */
export const API_ERROR_CODES = {
  // 400 Bad Request
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MISSING_GAME_ID: 'MISSING_GAME_ID',

  // 401 Unauthorized
  MISSING_TOKEN: 'MISSING_TOKEN',
  INVALID_SESSION: 'INVALID_SESSION',

  // 403 Forbidden
  GAME_MISMATCH: 'GAME_MISMATCH',

  // 404 Not Found
  GAME_NOT_FOUND: 'GAME_NOT_FOUND',

  // 409 Conflict
  GAME_NOT_STARTED: 'GAME_NOT_STARTED',
  GAME_ALREADY_FINISHED: 'GAME_ALREADY_FINISHED',
  CONFIRMATION_NOT_REQUIRED: 'CONFIRMATION_NOT_REQUIRED',
  VERSION_CONFLICT: 'VERSION_CONFLICT',

  // 410 Gone
  GAME_EXPIRED: 'GAME_EXPIRED',

  // 429 Too Many Requests
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // 500 Internal Server Error
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  PLAYER_NOT_FOUND: 'PLAYER_NOT_FOUND',
} as const

/**
 * API 錯誤代碼類型
 */
export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES]

// ============================================================================
// 狀態碼與錯誤代碼映射
// ============================================================================

/**
 * 錯誤代碼對應的 HTTP 狀態碼映射
 */
export const ERROR_CODE_TO_STATUS: Record<ApiErrorCode, number> = {
  [API_ERROR_CODES.VALIDATION_ERROR]: HTTP_BAD_REQUEST,
  [API_ERROR_CODES.MISSING_GAME_ID]: HTTP_BAD_REQUEST,
  [API_ERROR_CODES.MISSING_TOKEN]: HTTP_UNAUTHORIZED,
  [API_ERROR_CODES.INVALID_SESSION]: HTTP_UNAUTHORIZED,
  [API_ERROR_CODES.GAME_MISMATCH]: HTTP_FORBIDDEN,
  [API_ERROR_CODES.GAME_NOT_FOUND]: HTTP_NOT_FOUND,
  [API_ERROR_CODES.GAME_NOT_STARTED]: HTTP_CONFLICT,
  [API_ERROR_CODES.GAME_ALREADY_FINISHED]: HTTP_CONFLICT,
  [API_ERROR_CODES.CONFIRMATION_NOT_REQUIRED]: HTTP_CONFLICT,
  [API_ERROR_CODES.VERSION_CONFLICT]: HTTP_CONFLICT,
  [API_ERROR_CODES.GAME_EXPIRED]: HTTP_GONE,
  [API_ERROR_CODES.RATE_LIMIT_EXCEEDED]: HTTP_TOO_MANY_REQUESTS,
  [API_ERROR_CODES.INTERNAL_ERROR]: HTTP_INTERNAL_SERVER_ERROR,
  [API_ERROR_CODES.PLAYER_NOT_FOUND]: HTTP_INTERNAL_SERVER_ERROR,
}
