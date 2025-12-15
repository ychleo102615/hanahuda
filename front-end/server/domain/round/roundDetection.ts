/**
 * Round Detection - Domain Layer
 *
 * @description
 * 特殊牌型檢測函數（手四、喰付）。
 * 純 TypeScript，無框架依賴。
 *
 * @module server/domain/round/roundDetection
 */

import { getCardMonth } from '../services/deckService'

/**
 * 手四檢測結果
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
 */
export interface KuttsukiResult {
  readonly hasKuttsuki: boolean
  readonly month: number | null
}

/**
 * 檢測喰付（場牌中有四張同月份牌）
 *
 * @param field - 場牌
 * @returns 喰付檢測結果
 */
export function detectKuttsuki(field: readonly string[]): KuttsukiResult {
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
      return { hasKuttsuki: true, month }
    }
  }

  return { hasKuttsuki: false, month: null }
}
