/**
 * DeckService - Domain Service
 *
 * @description
 * 處理牌組操作：洗牌、發牌。
 * 純函數，無外部依賴。
 *
 * @module server/domain/services/deckService
 */

import { ALL_CARD_IDS, TOTAL_DECK_SIZE, ALL_CARD_IDS_SET } from '../card/cardConstants'
import { DEAL_CONFIG } from '../card/dealConfig'

// Re-export 維持向後相容
export { ALL_CARD_IDS, TOTAL_DECK_SIZE, ALL_CARD_IDS_SET } from '../card/cardConstants'
export { DEAL_CONFIG } from '../card/dealConfig'

/**
 * 發牌結果
 */
export interface DealResult {
  /** 玩家手牌 Map: playerId -> cardIds */
  readonly playerHands: ReadonlyMap<string, readonly string[]>
  /** 場牌 */
  readonly field: readonly string[]
  /** 剩餘牌堆 */
  readonly deck: readonly string[]
}

/**
 * 從卡片 ID 取得月份
 *
 * @param cardId - MMTI 格式的卡片 ID
 * @returns 月份 (1-12)
 */
export function getCardMonth(cardId: string): number {
  if (cardId.length !== 4) {
    throw new Error(`Invalid card ID format: ${cardId}. Expected 4 characters (MMTI).`)
  }
  const month = parseInt(cardId.substring(0, 2), 10)
  if (isNaN(month) || month < 1 || month > 12) {
    throw new Error(`Invalid month in card ID: ${cardId}. Month must be 01-12.`)
  }
  return month
}

/**
 * Fisher-Yates 洗牌演算法
 *
 * 使用 Fisher-Yates (Knuth) shuffle 確保均勻隨機分布。
 *
 * @param array - 要洗牌的陣列（會被複製）
 * @returns 洗好的新陣列
 */
function fisherYatesShuffle<T>(array: readonly T[]): T[] {
  // 使用 Array.from 明確複製陣列
  const result: T[] = Array.from(array)

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    // 使用解構交換（TypeScript 可正確推斷類型）
    // 由於 i 和 j 都在有效範圍內（已由 for 迴圈和 j 的計算保證），
    // 這裡的索引存取是安全的
    const itemI = result[i]
    const itemJ = result[j]
    if (itemI !== undefined && itemJ !== undefined) {
      result[i] = itemJ
      result[j] = itemI
    }
  }
  return result
}

/**
 * 測試用牌組 - TRIPLE_MATCH 測試
 *
 * @description
 * 發牌順序設計：
 * - index 0-7: 玩家1 手牌（包含 1 月第 4 張 '0142'）
 * - index 8-15: 玩家2 手牌
 * - index 16-18: 場牌前 3 張為 1 月牌 ('0111', '0131', '0141')
 * - index 19-23: 場牌其他牌
 * - index 24-47: 剩餘牌堆
 *
 * 這樣玩家1 打出 '0142' 時會觸發 TRIPLE_MATCH（場上有 3 張 1 月牌）
 */
const TEST_DECK_TRIPLE_MATCH: readonly string[] = Object.freeze([
  // 玩家1 手牌 (8張) - index 0-7
  '0142', // 1月かす2 - 用來觸發 TRIPLE_MATCH
  '0221', // 2月
  '0231', // 2月
  '0341', // 3月
  '0421', // 4月
  '0521', // 5月
  '0621', // 6月
  '0721', // 7月

  // 玩家2 手牌 (8張) - index 8-15
  '0241', // 2月
  '0242', // 2月
  '0342', // 3月
  '0431', // 4月
  '0441', // 4月
  '0531', // 5月
  '0541', // 5月
  '0631', // 6月

  // 場牌 (8張) - index 16-23
  '0111', // 1月 - 場牌第1張 (TRIPLE_MATCH 目標)
  '0131', // 1月 - 場牌第2張 (TRIPLE_MATCH 目標)
  '0141', // 1月 - 場牌第3張 (TRIPLE_MATCH 目標)
  '0311', // 3月
  '0331', // 3月
  '0442', // 4月
  '0542', // 5月
  '0641', // 6月

  // 剩餘牌堆 (24張) - index 24-47
  '0642', // 6月
  '0731', // 7月
  '0741', // 7月
  '0742', // 7月
  '0811', // 8月
  '0821', // 8月
  '0841', // 8月
  '0842', // 8月
  '0921', // 9月
  '0931', // 9月
  '0941', // 9月
  '0942', // 9月
  '1021', // 10月
  '1031', // 10月
  '1041', // 10月
  '1042', // 10月
  '1111', // 11月
  '1121', // 11月
  '1131', // 11月
  '1141', // 11月
  '1211', // 12月
  '1241', // 12月
  '1242', // 12月
  '1243', // 12月
])

/**
 * 建立洗好的牌組
 *
 * @param useTestDeck - 是否使用測試牌組（預設 false）
 * @returns 洗好的 48 張卡片 ID 陣列
 */
export function createShuffledDeck(useTestDeck = false): string[] {
  if (useTestDeck) {
    // 測試模式：返回固定順序的牌組（複製以避免修改原陣列）
    return [...TEST_DECK_TRIPLE_MATCH]
  }
  return fisherYatesShuffle(ALL_CARD_IDS)
}

/**
 * 發牌
 *
 * 標準發牌: 每位玩家 8 張，場上 8 張，牌堆剩餘 24 張。
 * 發牌順序: 玩家1(8) -> 玩家2(8) -> 場牌(8) -> 剩餘牌堆(24)
 *
 * @param deck - 洗好的牌組（48 張）
 * @param playerIds - 玩家 ID 列表（必須是 2 位）
 * @returns 發牌結果
 * @throws Error 如果牌組數量不正確或玩家數量不是 2
 */
export function deal(deck: readonly string[], playerIds: readonly string[]): DealResult {
  if (deck.length !== TOTAL_DECK_SIZE) {
    throw new Error(`Invalid deck size: ${deck.length}. Expected ${TOTAL_DECK_SIZE} cards.`)
  }

  if (playerIds.length !== 2) {
    throw new Error(`Invalid number of players: ${playerIds.length}. Expected 2 players.`)
  }

  const mutableDeck = [...deck]

  // 玩家1 手牌 (8張)
  const player1Hand = mutableDeck.splice(0, DEAL_CONFIG.CARDS_PER_PLAYER)

  // 玩家2 手牌 (8張)
  const player2Hand = mutableDeck.splice(0, DEAL_CONFIG.CARDS_PER_PLAYER)

  // 場牌 (8張)
  const field = mutableDeck.splice(0, DEAL_CONFIG.FIELD_CARDS)

  // 剩餘牌堆 (24張)
  const remainingDeck = mutableDeck

  // 建立玩家手牌 Map
  const playerHands = new Map<string, readonly string[]>()
  const player1Id = playerIds[0]
  const player2Id = playerIds[1]

  if (!player1Id || !player2Id) {
    throw new Error('Player IDs must not be empty')
  }

  playerHands.set(player1Id, Object.freeze(player1Hand))
  playerHands.set(player2Id, Object.freeze(player2Hand))

  return Object.freeze({
    playerHands: playerHands,
    field: Object.freeze(field),
    deck: Object.freeze(remainingDeck),
  })
}

/**
 * 驗證牌組完整性
 *
 * 檢查牌組是否包含所有 48 張不重複的卡片。
 *
 * @param deck - 要驗證的牌組
 * @returns 是否為有效的完整牌組
 */
export function isValidDeck(deck: readonly string[]): boolean {
  if (deck.length !== TOTAL_DECK_SIZE) {
    return false
  }

  const cardSet = new Set(deck)
  if (cardSet.size !== TOTAL_DECK_SIZE) {
    return false // 有重複的卡片
  }

  // 檢查是否所有卡片都是有效的（使用 Set 做 O(1) 查詢）
  for (const cardId of deck) {
    if (!ALL_CARD_IDS_SET.has(cardId)) {
      return false
    }
  }

  return true
}
