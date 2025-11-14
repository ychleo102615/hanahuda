/**
 * User Interface BC - Domain Layer 配對邏輯
 *
 * 提供卡片配對驗證功能,用於 UI 高亮提示。
 *
 * 配對規則:
 * - 兩張卡片月份相同即可配對
 * - 類型不影響配對關係
 *
 * @module user-interface/domain/matching
 * @version 1.0.0
 * @since 2025-11-13
 */

import type { Card } from './types'

/**
 * 判斷兩張卡片是否可配對
 *
 * 配對規則:月份相同的卡片可以配對
 *
 * @param card1 - 第一張卡片
 * @param card2 - 第二張卡片
 * @returns 是否可配對
 *
 * @example
 * ```typescript
 * canMatch(MATSU_HIKARI, MATSU_KASU_1) // true (都是1月)
 * canMatch(MATSU_HIKARI, UME_AKATAN)   // false (1月 vs 2月)
 * ```
 */
export function canMatch(card1: Readonly<Card>, card2: Readonly<Card>): boolean {
  return card1.month === card2.month
}

/**
 * 找出所有可與手牌配對的場牌
 *
 * 從場牌列表中過濾出所有與手牌月份相同的卡片。
 *
 * 返回結果:
 * - 空陣列: 無配對
 * - 單元素陣列: 單一配對
 * - 多元素陣列: 多重配對（玩家需選擇）
 *
 * @param handCard - 手牌
 * @param fieldCards - 場牌列表
 * @returns 可配對的場牌列表（保持原始順序）
 *
 * @example
 * ```typescript
 * const handCard = MATSU_HIKARI // 1月
 * const fieldCards = [UME_AKATAN, MATSU_KASU_1, SAKURA_HIKARI] // 2月, 1月, 3月
 *
 * findMatchableCards(handCard, fieldCards) // [MATSU_KASU_1]
 * ```
 */
export function findMatchableCards(
  handCard: Readonly<Card>,
  fieldCards: readonly Card[],
): readonly Card[] {
  return fieldCards.filter((fieldCard) => canMatch(handCard, fieldCard))
}
