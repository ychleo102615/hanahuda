/**
 * User Interface BC - Domain Layer 卡片邏輯
 *
 * 提供卡片驗證、查詢和比較功能。
 *
 * 所有函數為純函數,無副作用,可在任何環境運行。
 *
 * @module user-interface/domain/card-logic
 * @version 1.0.0
 * @since 2025-11-13
 */

import type { Card } from './types'
import { ALL_CARDS } from './card-database'
import { isCardType } from './types'

/**
 * 驗證卡片是否有效
 *
 * 驗證規則:
 * 1. card_id 必須符合 MMTI 格式（4位數字）
 * 2. month 必須在 1-12 範圍內
 * 3. type 必須為合法的 CardType
 * 4. 卡片必須存在於 ALL_CARDS 中
 *
 * @param card - 待驗證的卡片
 * @returns 是否為有效卡片
 *
 * @example
 * ```typescript
 * isValidCard(MATSU_HIKARI) // true
 * isValidCard({ card_id: "9999", month: 1, type: "BRIGHT", display_name: "無效" }) // false
 * ```
 */
export function isValidCard(card: Readonly<Card>): boolean {
  // 1. 驗證 card_id 格式（MMTI 4位數字）
  if (!card.card_id || !/^\d{4}$/.test(card.card_id)) {
    return false
  }

  // 2. 驗證 month 範圍（1-12）
  if (card.month < 1 || card.month > 12) {
    return false
  }

  // 3. 驗證 type 枚舉合法性
  if (!isCardType(card.type)) {
    return false
  }

  // 4. 驗證卡片存在於 ALL_CARDS 中
  return ALL_CARDS.some((c) => c.card_id === card.card_id)
}

/**
 * 根據 card_id 查詢卡片
 *
 * 從 ALL_CARDS 中查詢指定 card_id 的卡片。
 *
 * @param cardId - 卡片 ID（MMTI 格式）
 * @returns 找到的卡片,若不存在則返回 undefined
 *
 * @example
 * ```typescript
 * getCardById("0111") // MATSU_HIKARI
 * getCardById("9999") // undefined
 * ```
 */
export function getCardById(cardId: string): Readonly<Card> | undefined {
  return ALL_CARDS.find((card) => card.card_id === cardId)
}

/**
 * 判斷兩張卡片是否相等
 *
 * 基於 card_id 比較,不受其他屬性影響。
 *
 * @param card1 - 第一張卡片
 * @param card2 - 第二張卡片
 * @returns 兩張卡片是否相等
 *
 * @example
 * ```typescript
 * areCardsEqual(MATSU_HIKARI, MATSU_HIKARI) // true
 * areCardsEqual(MATSU_HIKARI, UME_AKATAN) // false
 * ```
 */
export function areCardsEqual(card1: Readonly<Card>, card2: Readonly<Card>): boolean {
  return card1.card_id === card2.card_id
}
