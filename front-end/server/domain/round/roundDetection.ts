/**
 * Round Detection - Domain Layer
 *
 * @description
 * 特殊牌型檢測函數（手四、喰付、場上手四）。
 * 純 TypeScript，無框架依賴。
 *
 * @module server/domain/round/roundDetection
 */

import { getCardMonth } from '../services/deckService'

/**
 * 手四檢測結果
 *
 * @description
 * 手四（Teshi）：手牌中有 4 張同月份的牌。
 * 觸發者獲得 6 分，該局結束。
 */
export interface TeshiResult {
  readonly hasTeshi: boolean
  readonly month: number | null
}

/**
 * 檢測手四（手牌中有四張同月份牌）
 *
 * @param hand - 玩家手牌
 * @returns 手四檢測結果
 */
export function detectTeshi(hand: readonly string[]): TeshiResult {
  // 統計各月份牌數
  const monthCounts = new Map<number, number>()

  for (const cardId of hand) {
    const month = getCardMonth(cardId)
    const count = monthCounts.get(month) ?? 0
    monthCounts.set(month, count + 1)
  }

  // 找出有四張的月份
  for (const [month, count] of monthCounts.entries()) {
    if (count === 4) {
      return { hasTeshi: true, month }
    }
  }

  return { hasTeshi: false, month: null }
}

/**
 * 喰付檢測結果
 *
 * @description
 * 喰付（Kuttsuki）：手牌中有 4 對同月份的牌（8 張牌都是成對的）。
 * 觸發者獲得 6 分，該局結束。
 */
export interface KuttsukiResult {
  readonly hasKuttsuki: boolean
  readonly months: readonly number[] | null
}

/**
 * 檢測喰付（手牌中有四對同月份牌）
 *
 * @description
 * 喰付條件：手牌剛好 8 張，且這 8 張牌可以分成 4 對，
 * 每對都是同月份的 2 張牌。
 *
 * @param hand - 玩家手牌
 * @returns 喰付檢測結果
 */
export function detectKuttsuki(hand: readonly string[]): KuttsukiResult {
  // 手牌必須剛好 8 張
  if (hand.length !== 8) {
    return { hasKuttsuki: false, months: null }
  }

  // 統計各月份牌數
  const monthCounts = new Map<number, number>()

  for (const cardId of hand) {
    const month = getCardMonth(cardId)
    const count = monthCounts.get(month) ?? 0
    monthCounts.set(month, count + 1)
  }

  // 必須剛好 4 個月份
  if (monthCounts.size !== 4) {
    return { hasKuttsuki: false, months: null }
  }

  // 每個月份必須剛好 2 張
  for (const count of monthCounts.values()) {
    if (count !== 2) {
      return { hasKuttsuki: false, months: null }
    }
  }

  return { hasKuttsuki: true, months: [...monthCounts.keys()] }
}

/**
 * 場上手四檢測結果
 *
 * @description
 * 場上手四（Field Teshi）：場牌中有 4 張同月份的牌。
 * 流局重發，無人獲分。
 */
export interface FieldTeshiResult {
  readonly hasFieldTeshi: boolean
  readonly month: number | null
}

/**
 * 檢測場上手四（場牌中有四張同月份牌）
 *
 * @param field - 場牌
 * @returns 場上手四檢測結果
 */
export function detectFieldTeshi(field: readonly string[]): FieldTeshiResult {
  // 統計各月份牌數
  const monthCounts = new Map<number, number>()

  for (const cardId of field) {
    const month = getCardMonth(cardId)
    const count = monthCounts.get(month) ?? 0
    monthCounts.set(month, count + 1)
  }

  // 找出有四張的月份
  for (const [month, count] of monthCounts.entries()) {
    if (count === 4) {
      return { hasFieldTeshi: true, month }
    }
  }

  return { hasFieldTeshi: false, month: null }
}
