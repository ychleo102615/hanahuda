/**
 * DeckService Tests
 *
 * @description
 * 牌組服務的單元測試。
 * 測試牌組建立、洗牌、發牌和驗證。
 *
 * @module server/__tests__/domain/services/deckService.test
 */

import { describe, it, expect } from 'vitest'
import {
  getCardMonth,
  createShuffledDeck,
  deal,
  isValidDeck,
  ALL_CARD_IDS,
  TOTAL_DECK_SIZE,
  ALL_CARD_IDS_SET,
  DEAL_CONFIG,
} from '~/server/core-game/domain/services/deckService'
import { PLAYER_1_ID, PLAYER_2_ID } from '../../fixtures/games'

describe('deckService', () => {
  describe('getCardMonth', () => {
    it('應正確解析 1 月卡片', () => {
      expect(getCardMonth('0111')).toBe(1)
      expect(getCardMonth('0131')).toBe(1)
      expect(getCardMonth('0142')).toBe(1)
    })

    it('應正確解析 12 月卡片', () => {
      expect(getCardMonth('1211')).toBe(12)
      expect(getCardMonth('1241')).toBe(12)
      expect(getCardMonth('1243')).toBe(12)
    })

    it('應正確解析所有月份', () => {
      for (let month = 1; month <= 12; month++) {
        const monthStr = month.toString().padStart(2, '0')
        const cardId = `${monthStr}11`
        expect(getCardMonth(cardId)).toBe(month)
      }
    })

    it('無效格式應拋出錯誤', () => {
      expect(() => getCardMonth('111')).toThrow('Invalid card ID format')
      expect(() => getCardMonth('01111')).toThrow('Invalid card ID format')
      expect(() => getCardMonth('')).toThrow('Invalid card ID format')
    })

    it('無效月份應拋出錯誤', () => {
      expect(() => getCardMonth('0011')).toThrow('Invalid month')
      expect(() => getCardMonth('1311')).toThrow('Invalid month')
      expect(() => getCardMonth('xx11')).toThrow('Invalid month')
    })
  })

  describe('createShuffledDeck', () => {
    it('應建立 48 張卡片的牌組', () => {
      const deck = createShuffledDeck()

      expect(deck).toHaveLength(48)
    })

    it('牌組應包含所有不重複的卡片', () => {
      const deck = createShuffledDeck()
      const uniqueCards = new Set(deck)

      expect(uniqueCards.size).toBe(48)
    })

    it('牌組應只包含有效卡片', () => {
      const deck = createShuffledDeck()

      deck.forEach((cardId) => {
        expect(ALL_CARD_IDS_SET.has(cardId)).toBe(true)
      })
    })

    it('洗牌應產生隨機順序', () => {
      // 多次洗牌，至少有一次順序不同
      const decks = Array.from({ length: 10 }, () => createShuffledDeck())
      const firstDeck = decks[0]!.join(',')

      const hasVariation = decks.some((deck) => deck.join(',') !== firstDeck)

      expect(hasVariation).toBe(true)
    })

    it('使用測試牌組時應返回固定順序', () => {
      const deck1 = createShuffledDeck(true)
      const deck2 = createShuffledDeck(true)

      expect(deck1).toEqual(deck2)
      expect(deck1).toHaveLength(48)
    })
  })

  describe('deal', () => {
    it('應正確發牌', () => {
      const deck = createShuffledDeck()
      const playerIds = [PLAYER_1_ID, PLAYER_2_ID]

      const result = deal(deck, playerIds)

      // 檢查玩家手牌
      expect(result.playerHands.get(PLAYER_1_ID)).toHaveLength(8)
      expect(result.playerHands.get(PLAYER_2_ID)).toHaveLength(8)

      // 檢查場牌
      expect(result.field).toHaveLength(8)

      // 檢查牌堆
      expect(result.deck).toHaveLength(24)
    })

    it('發牌後所有卡片不應重複', () => {
      const deck = createShuffledDeck()
      const playerIds = [PLAYER_1_ID, PLAYER_2_ID]

      const result = deal(deck, playerIds)

      const allCards = [
        ...result.playerHands.get(PLAYER_1_ID)!,
        ...result.playerHands.get(PLAYER_2_ID)!,
        ...result.field,
        ...result.deck,
      ]

      const uniqueCards = new Set(allCards)
      expect(uniqueCards.size).toBe(48)
    })

    it('牌組數量不正確時應拋出錯誤', () => {
      const invalidDeck = ALL_CARD_IDS.slice(0, 40)
      const playerIds = [PLAYER_1_ID, PLAYER_2_ID]

      expect(() => deal(invalidDeck, playerIds)).toThrow('Invalid deck size')
    })

    it('玩家數量不是 2 時應拋出錯誤', () => {
      const deck = createShuffledDeck()

      expect(() => deal(deck, [PLAYER_1_ID])).toThrow('Invalid number of players')
      expect(() => deal(deck, [PLAYER_1_ID, PLAYER_2_ID, 'player-3'])).toThrow(
        'Invalid number of players'
      )
    })

    it('玩家 ID 為空時應拋出錯誤', () => {
      const deck = createShuffledDeck()

      expect(() => deal(deck, ['', PLAYER_2_ID])).toThrow('Player IDs must not be empty')
    })

    it('發牌順序應正確', () => {
      // 使用測試牌組確保順序固定
      const deck = createShuffledDeck(true)
      const playerIds = [PLAYER_1_ID, PLAYER_2_ID]

      const result = deal(deck, playerIds)

      // 前 8 張給玩家 1
      expect(result.playerHands.get(PLAYER_1_ID)).toEqual(deck.slice(0, 8))

      // 接下來 8 張給玩家 2
      expect(result.playerHands.get(PLAYER_2_ID)).toEqual(deck.slice(8, 16))

      // 接下來 8 張給場牌
      expect([...result.field]).toEqual(deck.slice(16, 24))

      // 剩餘 24 張為牌堆
      expect([...result.deck]).toEqual(deck.slice(24, 48))
    })
  })

  describe('isValidDeck', () => {
    it('有效牌組應返回 true', () => {
      const deck = createShuffledDeck()

      expect(isValidDeck(deck)).toBe(true)
    })

    it('數量不足應返回 false', () => {
      const invalidDeck = ALL_CARD_IDS.slice(0, 47)

      expect(isValidDeck(invalidDeck)).toBe(false)
    })

    it('數量過多應返回 false', () => {
      const invalidDeck = [...ALL_CARD_IDS, '0111']

      expect(isValidDeck(invalidDeck)).toBe(false)
    })

    it('有重複卡片應返回 false', () => {
      const invalidDeck = [...ALL_CARD_IDS.slice(0, 47), '0111']

      expect(isValidDeck(invalidDeck)).toBe(false)
    })

    it('有無效卡片應返回 false', () => {
      const invalidDeck = [...ALL_CARD_IDS.slice(0, 47), '9999']

      expect(isValidDeck(invalidDeck)).toBe(false)
    })

    it('空牌組應返回 false', () => {
      expect(isValidDeck([])).toBe(false)
    })
  })

  describe('常數驗證', () => {
    it('ALL_CARD_IDS 應有 48 張', () => {
      expect(ALL_CARD_IDS).toHaveLength(48)
    })

    it('TOTAL_DECK_SIZE 應為 48', () => {
      expect(TOTAL_DECK_SIZE).toBe(48)
    })

    it('ALL_CARD_IDS_SET 應有 48 個不重複元素', () => {
      expect(ALL_CARD_IDS_SET.size).toBe(48)
    })

    it('DEAL_CONFIG 應正確設定', () => {
      expect(DEAL_CONFIG.CARDS_PER_PLAYER).toBe(8)
      expect(DEAL_CONFIG.FIELD_CARDS).toBe(8)
    })

    it('每個月份應有 4 張牌', () => {
      for (let month = 1; month <= 12; month++) {
        const monthCards = ALL_CARD_IDS.filter((id) => getCardMonth(id) === month)
        expect(monthCards).toHaveLength(4)
      }
    })
  })
})
