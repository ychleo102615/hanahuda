/**
 * 卡片資料庫測試
 *
 * 測試目標:
 * - 語義化常數查詢正確性
 * - ALL_CARDS 包含 48 張牌
 * - 每月卡片數量正確
 */

import { describe, it, expect } from 'vitest'
import {
  ALL_CARDS,
  MATSU_HIKARI,
  UME_AKATAN,
  SAKURA_HIKARI,
  FUJI_HOTOTOGISU,
  AYAME_KAKITSUBATA,
  BOTAN_CHOU,
  HAGI_INO,
  SUSUKI_HIKARI,
  KIKU_SAKAZUKI,
  MOMIJI_SHIKA,
  YANAGI_HIKARI,
  KIRI_HIKARI,
  MATSU_KASU_1,
  KIRI_KASU_3,
} from '@/user-interface/domain/card-database'

describe('card-database.ts', () => {
  describe('語義化常數定義', () => {
    it('MATSU_HIKARI 應返回正確的卡片資訊', () => {
      expect(MATSU_HIKARI).toEqual({
        card_id: '0111',
        month: 1,
        type: 'BRIGHT',
        display_name: '松鶴',
      })
    })

    it('UME_AKATAN 應返回正確的卡片資訊', () => {
      expect(UME_AKATAN).toEqual({
        card_id: '0231',
        month: 2,
        type: 'RIBBON',
        display_name: '梅赤短',
      })
    })

    it('SAKURA_HIKARI 應返回正確的卡片資訊', () => {
      expect(SAKURA_HIKARI).toEqual({
        card_id: '0311',
        month: 3,
        type: 'BRIGHT',
        display_name: '櫻幕',
      })
    })

    it('HAGI_INO 應返回正確的卡片資訊（種牌）', () => {
      expect(HAGI_INO).toEqual({
        card_id: '0721',
        month: 7,
        type: 'ANIMAL',
        display_name: '萩豬',
      })
    })

    it('MATSU_KASU_1 應返回正確的卡片資訊（かす）', () => {
      expect(MATSU_KASU_1).toEqual({
        card_id: '0141',
        month: 1,
        type: 'PLAIN',
        display_name: '松かす1',
      })
    })

    it('KIRI_KASU_3 應返回正確的卡片資訊（12月第3張かす）', () => {
      expect(KIRI_KASU_3).toEqual({
        card_id: '1243',
        month: 12,
        type: 'PLAIN',
        display_name: '桐かす3',
      })
    })
  })

  describe('ALL_CARDS 陣列', () => {
    it('應包含 48 張卡片', () => {
      expect(ALL_CARDS).toHaveLength(48)
    })

    it('所有卡片應為不可變物件（frozen）', () => {
      ALL_CARDS.forEach((card) => {
        expect(Object.isFrozen(card)).toBe(true)
      })
    })

    it('ALL_CARDS 陣列本身應為不可變', () => {
      expect(Object.isFrozen(ALL_CARDS)).toBe(true)
    })

    it('所有卡片的 card_id 應唯一', () => {
      const cardIds = ALL_CARDS.map((card) => card.card_id)
      const uniqueIds = new Set(cardIds)
      expect(uniqueIds.size).toBe(48)
    })

    it('應包含 5 張光牌（BRIGHT）', () => {
      const brightCards = ALL_CARDS.filter((card) => card.type === 'BRIGHT')
      expect(brightCards).toHaveLength(5)
    })

    it('應包含 9 張種牌（ANIMAL）', () => {
      const animalCards = ALL_CARDS.filter((card) => card.type === 'ANIMAL')
      expect(animalCards).toHaveLength(9)
    })

    it('應包含 10 張短冊（RIBBON）', () => {
      const ribbonCards = ALL_CARDS.filter((card) => card.type === 'RIBBON')
      expect(ribbonCards).toHaveLength(10)
    })

    it('應包含 24 張かす（PLAIN）', () => {
      const plainCards = ALL_CARDS.filter((card) => card.type === 'PLAIN')
      expect(plainCards).toHaveLength(24)
    })
  })

  describe('每月卡片數量', () => {
    it('1月應有 4 張卡片', () => {
      const month1Cards = ALL_CARDS.filter((card) => card.month === 1)
      expect(month1Cards).toHaveLength(4)
    })

    it('2月應有 4 張卡片', () => {
      const month2Cards = ALL_CARDS.filter((card) => card.month === 2)
      expect(month2Cards).toHaveLength(4)
    })

    it('3月應有 4 張卡片', () => {
      const month3Cards = ALL_CARDS.filter((card) => card.month === 3)
      expect(month3Cards).toHaveLength(4)
    })

    it('4月應有 4 張卡片', () => {
      const month4Cards = ALL_CARDS.filter((card) => card.month === 4)
      expect(month4Cards).toHaveLength(4)
    })

    it('5月應有 4 張卡片', () => {
      const month5Cards = ALL_CARDS.filter((card) => card.month === 5)
      expect(month5Cards).toHaveLength(4)
    })

    it('6月應有 4 張卡片', () => {
      const month6Cards = ALL_CARDS.filter((card) => card.month === 6)
      expect(month6Cards).toHaveLength(4)
    })

    it('7月應有 4 張卡片', () => {
      const month7Cards = ALL_CARDS.filter((card) => card.month === 7)
      expect(month7Cards).toHaveLength(4)
    })

    it('8月應有 4 張卡片', () => {
      const month8Cards = ALL_CARDS.filter((card) => card.month === 8)
      expect(month8Cards).toHaveLength(4)
    })

    it('9月應有 4 張卡片', () => {
      const month9Cards = ALL_CARDS.filter((card) => card.month === 9)
      expect(month9Cards).toHaveLength(4)
    })

    it('10月應有 4 張卡片', () => {
      const month10Cards = ALL_CARDS.filter((card) => card.month === 10)
      expect(month10Cards).toHaveLength(4)
    })

    it('11月應有 4 張卡片', () => {
      const month11Cards = ALL_CARDS.filter((card) => card.month === 11)
      expect(month11Cards).toHaveLength(4)
    })

    it('12月應有 4 張卡片', () => {
      const month12Cards = ALL_CARDS.filter((card) => card.month === 12)
      expect(month12Cards).toHaveLength(4)
    })
  })

  describe('特定光牌驗證', () => {
    it('應包含松上鶴（MATSU_HIKARI）', () => {
      expect(ALL_CARDS).toContainEqual(MATSU_HIKARI)
    })

    it('應包含櫻幕（SAKURA_HIKARI）', () => {
      expect(ALL_CARDS).toContainEqual(SAKURA_HIKARI)
    })

    it('應包含芒月（SUSUKI_HIKARI）', () => {
      expect(ALL_CARDS).toContainEqual(SUSUKI_HIKARI)
    })

    it('應包含柳小野道風（YANAGI_HIKARI）', () => {
      expect(ALL_CARDS).toContainEqual(YANAGI_HIKARI)
    })

    it('應包含桐鳳凰（KIRI_HIKARI）', () => {
      expect(ALL_CARDS).toContainEqual(KIRI_HIKARI)
    })
  })

  describe('卡片 ID 格式驗證', () => {
    it('所有卡片的 card_id 應符合 MMTI 格式（4位數字）', () => {
      ALL_CARDS.forEach((card) => {
        expect(card.card_id).toMatch(/^\d{4}$/)
      })
    })

    it('所有卡片的 month 應在 1-12 範圍內', () => {
      ALL_CARDS.forEach((card) => {
        expect(card.month).toBeGreaterThanOrEqual(1)
        expect(card.month).toBeLessThanOrEqual(12)
      })
    })

    it('所有卡片的 type 應為合法類型', () => {
      const validTypes = ['BRIGHT', 'ANIMAL', 'RIBBON', 'PLAIN']
      ALL_CARDS.forEach((card) => {
        expect(validTypes).toContain(card.type)
      })
    })

    it('所有卡片應有非空的 display_name', () => {
      ALL_CARDS.forEach((card) => {
        expect(card.display_name).toBeTruthy()
        expect(card.display_name.length).toBeGreaterThan(0)
      })
    })
  })
})
