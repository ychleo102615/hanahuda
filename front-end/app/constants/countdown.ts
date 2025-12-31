/**
 * Countdown Constants
 *
 * @description
 * 倒數計時相關的常數定義。
 */

/**
 * 確認繼續遊戲的預設超時秒數
 *
 * @description
 * 當 RoundEndedEvent 設定 require_continue_confirmation = true
 * 但 timeout_seconds 未定義時的預設值。
 *
 * 這是防禦性設計，正常情況下後端應該總是提供 timeout_seconds。
 */
export const DEFAULT_CONFIRMATION_TIMEOUT_SECONDS = 5
