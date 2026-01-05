/**
 * Feature Flags
 *
 * @description
 * 功能開關常數定義。
 * 用於控制功能的啟用/停用狀態。
 */

/**
 * 是否啟用 OAuth 登入功能（Google、Line）
 *
 * 設定為 true 時：
 * - 登入/註冊頁面顯示 OAuth 按鈕
 * - 支援帳號連結功能
 *
 * 設定為 false 時：
 * - 隱藏所有 OAuth 相關 UI
 * - 僅支援帳號密碼登入/註冊
 */
export const ENABLE_OAUTH_LOGIN = false
