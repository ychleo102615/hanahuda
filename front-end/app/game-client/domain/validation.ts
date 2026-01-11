/**
 * User Interface BC - Domain Layer 客戶端驗證
 *
 * 提供發送命令到伺服器前的基本驗證功能。
 *
 * 重要提醒:
 * - 客戶端驗證僅用於 UI 即時反饋
 * - 伺服器擁有最終驗證權威
 * - 不應依賴客戶端驗證結果更新遊戲狀態
 *
 * @module game-client/domain/validation
 * @version 1.0.0
 * @since 2025-11-13
 */

import type { Card, ValidationResult } from './types'
import { areCardsEqual } from './card-logic'

/**
 * 驗證卡片是否存在於手牌中
 *
 * 用途: 在玩家嘗試打出卡片前，驗證該卡片是否真的在手牌中。
 *
 * @param card - 待驗證的卡片
 * @param handCards - 手牌列表
 * @returns 驗證結果
 *
 * @example
 * ```typescript
 * const result = validateCardExists(MATSU_HIKARI, [MATSU_HIKARI, UME_AKATAN])
 * // { valid: true }
 *
 * const result2 = validateCardExists(SAKURA_HIKARI, [MATSU_HIKARI, UME_AKATAN])
 * // { valid: false, reason: "卡片不在手牌中" }
 * ```
 */
export function validateCardExists(
  card: Readonly<Card>,
  handCards: readonly Card[],
): ValidationResult {
  // 檢查卡片是否在手牌中
  const exists = handCards.some((handCard) => areCardsEqual(card, handCard))

  if (exists) {
    return { valid: true }
  }

  return {
    valid: false,
    reason: '卡片不在手牌中',
  }
}

/**
 * 驗證目標是否在可配對列表中
 *
 * 用途: 在玩家選擇配對目標前，驗證該目標是否在可配對卡片列表中。
 *
 * @param target - 選擇的目標卡片
 * @param matchableCards - 可配對的卡片列表
 * @returns 驗證結果
 *
 * @example
 * ```typescript
 * const result = validateTargetInList(MATSU_KASU_1, [MATSU_KASU_1, MATSU_AKATAN])
 * // { valid: true }
 *
 * const result2 = validateTargetInList(UME_AKATAN, [MATSU_KASU_1, MATSU_AKATAN])
 * // { valid: false, reason: "目標不在可配對列表中" }
 * ```
 */
export function validateTargetInList(
  target: Readonly<Card>,
  matchableCards: readonly Card[],
): ValidationResult {
  // 檢查目標是否在可配對列表中
  const inList = matchableCards.some((matchableCard) => areCardsEqual(target, matchableCard))

  if (inList) {
    return { valid: true }
  }

  return {
    valid: false,
    reason: '目標不在可配對列表中',
  }
}
