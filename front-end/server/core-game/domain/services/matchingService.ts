/**
 * MatchingService - Domain Service
 *
 * @description
 * 處理卡片配對邏輯：判斷配對、尋找配對目標。
 * 純函數，無外部依賴。
 *
 * @module server/domain/services/matchingService
 */

import { getCardMonth } from './deckService'

/**
 * 檢查兩張牌是否可配對（同月份）
 *
 * @param card1 - 第一張卡片 ID (MMTI 格式)
 * @param card2 - 第二張卡片 ID (MMTI 格式)
 * @returns 是否為同月份（可配對）
 */
export function canMatch(card1: string, card2: string): boolean {
  return getCardMonth(card1) === getCardMonth(card2)
}

/**
 * 找出場上所有可配對的目標
 *
 * @param cardId - 要配對的卡片 ID (MMTI 格式)
 * @param fieldCards - 場牌列表
 * @returns 可配對的場牌 ID 陣列
 */
export function findMatchableTargets(
  cardId: string,
  fieldCards: readonly string[]
): readonly string[] {
  const cardMonth = getCardMonth(cardId)

  return Object.freeze(
    fieldCards.filter((fieldCard) => getCardMonth(fieldCard) === cardMonth)
  )
}

/**
 * 配對結果類型
 */
export type MatchResult =
  | { type: 'NO_MATCH' }
  | { type: 'SINGLE_MATCH'; target: string }
  | { type: 'DOUBLE_MATCH'; targets: readonly [string, string] }
  | { type: 'TRIPLE_MATCH'; targets: readonly [string, string, string] }

/**
 * 分析配對情況
 *
 * @param cardId - 要配對的卡片 ID
 * @param fieldCards - 場牌列表
 * @returns 配對結果
 */
export function analyzeMatch(
  cardId: string,
  fieldCards: readonly string[]
): MatchResult {
  const matchableTargets = findMatchableTargets(cardId, fieldCards)

  switch (matchableTargets.length) {
    case 0:
      return { type: 'NO_MATCH' }
    case 1: {
      const target = matchableTargets[0]
      if (target === undefined) {
        return { type: 'NO_MATCH' }
      }
      return { type: 'SINGLE_MATCH', target }
    }
    case 2: {
      const [t1, t2] = matchableTargets
      if (t1 === undefined || t2 === undefined) {
        return { type: 'NO_MATCH' }
      }
      return { type: 'DOUBLE_MATCH', targets: [t1, t2] }
    }
    case 3:
    default: {
      // 3 張以上配對，收集全部（實際上花牌最多 3 張同月份在場上）
      const [t1, t2, t3] = matchableTargets
      if (t1 === undefined || t2 === undefined || t3 === undefined) {
        // 如果不足 3 張，降級處理
        if (t1 !== undefined && t2 !== undefined) {
          return { type: 'DOUBLE_MATCH', targets: [t1, t2] }
        }
        if (t1 !== undefined) {
          return { type: 'SINGLE_MATCH', target: t1 }
        }
        return { type: 'NO_MATCH' }
      }
      return { type: 'TRIPLE_MATCH', targets: [t1, t2, t3] }
    }
  }
}

/**
 * 執行配對並返回捕獲的卡片
 *
 * @param playedCard - 打出的卡片 ID
 * @param targetCard - 配對目標（可選）
 * @param matchResult - 配對分析結果
 * @returns 捕獲的卡片列表（包含打出的牌和配對的牌）
 */
export function executeCaptureFromMatch(
  playedCard: string,
  targetCard: string | null,
  matchResult: MatchResult
): readonly string[] {
  switch (matchResult.type) {
    case 'NO_MATCH':
      // 無配對，不捕獲任何卡片
      return Object.freeze([])

    case 'SINGLE_MATCH':
      // 單配對，捕獲打出的牌和配對的牌
      return Object.freeze([playedCard, matchResult.target])

    case 'DOUBLE_MATCH':
      // 雙重配對，需要玩家選擇目標
      if (targetCard === null) {
        throw new Error('Double match requires target selection')
      }
      if (!matchResult.targets.includes(targetCard)) {
        throw new Error(`Invalid target: ${targetCard}. Must be one of ${matchResult.targets.join(', ')}`)
      }
      return Object.freeze([playedCard, targetCard])

    case 'TRIPLE_MATCH':
      // 三重配對（場上有 3 張同月份），捕獲全部 4 張
      return Object.freeze([playedCard, ...matchResult.targets])
  }
}

/**
 * 從場牌中移除被捕獲的卡片
 *
 * @param fieldCards - 當前場牌
 * @param capturedCards - 被捕獲的卡片（不包含打出的手牌）
 * @returns 更新後的場牌
 */
export function removeFromField(
  fieldCards: readonly string[],
  capturedCards: readonly string[]
): readonly string[] {
  const capturedSet = new Set(capturedCards)
  return Object.freeze(fieldCards.filter((card) => !capturedSet.has(card)))
}

/**
 * 將卡片加入場牌（無配對時）
 *
 * @param fieldCards - 當前場牌
 * @param card - 要加入的卡片
 * @returns 更新後的場牌
 */
export function addToField(
  fieldCards: readonly string[],
  card: string
): readonly string[] {
  return Object.freeze([...fieldCards, card])
}
