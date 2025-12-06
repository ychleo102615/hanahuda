/**
 * DeckService - Domain Service
 *
 * @description
 * 處理牌組操作：洗牌、發牌。
 * 純函數，無外部依賴。
 *
 * @module server/domain/services/deckService
 */

/**
 * 所有 48 張卡片的 ID（MMTI 格式）
 *
 * MMTI 格式說明:
 * - MM: 月份 (01-12)
 * - T: 牌型 (1=光牌, 2=種牌, 3=短冊, 4=かす)
 * - I: 該月該牌型的序號 (1-4)
 *
 * 複製自 frontend card-database.ts
 */
export const ALL_CARD_IDS: readonly string[] = Object.freeze([
  // 1月 - 松 (4張)
  '0111', // 松鶴 (光牌)
  '0131', // 松赤短 (短冊)
  '0141', // 松かす1 (かす)
  '0142', // 松かす2 (かす)

  // 2月 - 梅 (4張)
  '0221', // 梅鶯 (種牌)
  '0231', // 梅赤短 (短冊)
  '0241', // 梅かす1 (かす)
  '0242', // 梅かす2 (かす)

  // 3月 - 櫻 (4張)
  '0311', // 櫻幕 (光牌)
  '0331', // 櫻赤短 (短冊)
  '0341', // 櫻かす1 (かす)
  '0342', // 櫻かす2 (かす)

  // 4月 - 藤 (4張)
  '0421', // 藤不如歸 (種牌)
  '0431', // 藤短冊 (短冊)
  '0441', // 藤かす1 (かす)
  '0442', // 藤かす2 (かす)

  // 5月 - 菖蒲 (4張)
  '0521', // 菖蒲燕子花 (種牌)
  '0531', // 菖蒲短冊 (短冊)
  '0541', // 菖蒲かす1 (かす)
  '0542', // 菖蒲かす2 (かす)

  // 6月 - 牡丹 (4張)
  '0621', // 牡丹蝶 (種牌)
  '0631', // 牡丹青短 (短冊)
  '0641', // 牡丹かす1 (かす)
  '0642', // 牡丹かす2 (かす)

  // 7月 - 萩 (4張)
  '0721', // 萩豬 (種牌)
  '0731', // 萩短冊 (短冊)
  '0741', // 萩かす1 (かす)
  '0742', // 萩かす2 (かす)

  // 8月 - 芒 (4張)
  '0811', // 芒月 (光牌)
  '0821', // 芒雁 (種牌)
  '0841', // 芒かす1 (かす)
  '0842', // 芒かす2 (かす)

  // 9月 - 菊 (4張)
  '0921', // 菊盃 (種牌)
  '0931', // 菊青短 (短冊)
  '0941', // 菊かす1 (かす)
  '0942', // 菊かす2 (かす)

  // 10月 - 紅葉 (4張)
  '1021', // 紅葉鹿 (種牌)
  '1031', // 紅葉青短 (短冊)
  '1041', // 紅葉かす1 (かす)
  '1042', // 紅葉かす2 (かす)

  // 11月 - 柳 (4張)
  '1111', // 柳小野道風/雨 (光牌)
  '1121', // 柳燕 (種牌)
  '1131', // 柳短冊 (短冊)
  '1141', // 柳かす (かす)

  // 12月 - 桐 (4張)
  '1211', // 桐鳳凰 (光牌)
  '1241', // 桐かす1 (かす)
  '1242', // 桐かす2 (かす)
  '1243', // 桐かす3 (かす)
])

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
 * 建立洗好的牌組
 *
 * @returns 洗好的 48 張卡片 ID 陣列
 */
export function createShuffledDeck(): string[] {
  return fisherYatesShuffle(ALL_CARD_IDS)
}

/**
 * 發牌配置常數
 */
export const DEAL_CONFIG = {
  /** 每位玩家的手牌數量 */
  CARDS_PER_PLAYER: 8,
  /** 場牌數量 */
  FIELD_CARDS: 8,
  /** 發牌後牌堆剩餘數量 */
  REMAINING_DECK: 24,
} as const

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
  if (deck.length !== 48) {
    throw new Error(`Invalid deck size: ${deck.length}. Expected 48 cards.`)
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
  if (deck.length !== 48) {
    return false
  }

  const cardSet = new Set(deck)
  if (cardSet.size !== 48) {
    return false // 有重複的卡片
  }

  // 檢查是否所有卡片都是有效的
  for (const cardId of deck) {
    if (!ALL_CARD_IDS.includes(cardId)) {
      return false
    }
  }

  return true
}
