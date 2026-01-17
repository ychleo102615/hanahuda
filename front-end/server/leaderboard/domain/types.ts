/**
 * Leaderboard BC - Domain Types
 *
 * @description
 * Leaderboard BC 的 Domain 層類型定義。
 * 獨立於 DB Schema，符合 Clean Architecture 的層級隔離原則。
 *
 * @module server/leaderboard/domain/types
 */

/**
 * 役種達成次數統計
 *
 * @description
 * 記錄每種役的達成次數。
 * Key: 役種類型 (e.g., 'KASU', 'TANE', 'GOKOU')
 * Value: 達成次數
 *
 * @example
 * ```typescript
 * const yakuCounts: YakuCounts = {
 *   'KASU': 5,
 *   'TANE': 3,
 *   'GOKOU': 1
 * }
 * ```
 */
export type YakuCounts = Readonly<Record<string, number>>

/**
 * 玩家 ID 型別別名
 */
export type PlayerId = string
