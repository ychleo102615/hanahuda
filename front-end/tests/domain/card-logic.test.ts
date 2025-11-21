/**
 * 卡片邏輯測試
 *
 * 測試目標:
 * - isValidCard() 驗證卡片有效性
 * - getCardById() 查詢卡片
 * - areCardsEqual() 卡片相等性判斷
 */

import { describe, it, expect } from 'vitest'
import { isValidCard, getCardById, areCardsEqual, getCardTypeFromId, groupByCardType } from '@/user-interface/domain/card-logic'
import { MATSU_HIKARI, UME_AKATAN, SAKURA_HIKARI } from '@/user-interface/domain/card-database'
import type { Card } from '@/user-interface/domain/types'

describe('card-logic.ts', () => {
  describe('isValidCard()', () => {
    describe('有效卡片', () => {
      it('應對標準卡片返回 true', () => {
        expect(isValidCard(MATSU_HIKARI)).toBe(true)
        expect(isValidCard(UME_AKATAN)).toBe(true)
        expect(isValidCard(SAKURA_HIKARI)).toBe(true)
      })

      it('應對所有合法 month (1-12) 返回 true', () => {
        const validCard: Card = {
          card_id: '0111',
          month: 1,
          type: 'BRIGHT',
          display_name: '松鶴',
        }
        expect(isValidCard(validCard)).toBe(true)
      })

      it('應對所有合法 type 返回 true', () => {
        expect(
          isValidCard({
            card_id: '0111',
            month: 1,
            type: 'BRIGHT',
            display_name: '松鶴',
          }),
        ).toBe(true)

        expect(
          isValidCard({
            card_id: '0221',
            month: 2,
            type: 'ANIMAL',
            display_name: '梅鶯',
          }),
        ).toBe(true)

        expect(
          isValidCard({
            card_id: '0231',
            month: 2,
            type: 'RIBBON',
            display_name: '梅赤短',
          }),
        ).toBe(true)

        expect(
          isValidCard({
            card_id: '0141',
            month: 1,
            type: 'PLAIN',
            display_name: '松かす1',
          }),
        ).toBe(true)
      })
    })

    describe('無效卡片 - card_id 格式錯誤', () => {
      it('應對非 MMTI 格式的 card_id 返回 false', () => {
        expect(
          isValidCard({
            card_id: '123', // 只有3位
            month: 1,
            type: 'BRIGHT',
            display_name: '測試',
          }),
        ).toBe(false)

        expect(
          isValidCard({
            card_id: '12345', // 5位
            month: 1,
            type: 'BRIGHT',
            display_name: '測試',
          }),
        ).toBe(false)

        expect(
          isValidCard({
            card_id: 'abcd', // 非數字
            month: 1,
            type: 'BRIGHT',
            display_name: '測試',
          }),
        ).toBe(false)
      })
    })

    describe('無效卡片 - month 超出範圍', () => {
      it('應對 month < 1 返回 false', () => {
        expect(
          isValidCard({
            card_id: '0011',
            month: 0,
            type: 'BRIGHT',
            display_name: '測試',
          }),
        ).toBe(false)
      })

      it('應對 month > 12 返回 false', () => {
        expect(
          isValidCard({
            card_id: '1311',
            month: 13,
            type: 'BRIGHT',
            display_name: '測試',
          }),
        ).toBe(false)
      })

      it('應對負數 month 返回 false', () => {
        expect(
          isValidCard({
            card_id: '9911',
            month: -1,
            type: 'BRIGHT',
            display_name: '測試',
          }),
        ).toBe(false)
      })
    })

    describe('無效卡片 - type 不合法', () => {
      it('應對無效的 type 返回 false', () => {
        expect(
          isValidCard({
            card_id: '0111',
            month: 1,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            type: 'INVALID' as any,
            display_name: '測試',
          }),
        ).toBe(false)
      })
    })

    describe('無效卡片 - 不存在於 ALL_CARDS', () => {
      it('應對不存在的卡片返回 false', () => {
        expect(
          isValidCard({
            card_id: '9999',
            month: 1,
            type: 'BRIGHT',
            display_name: '不存在的卡片',
          }),
        ).toBe(false)
      })
    })
  })

  describe('getCardById()', () => {
    it('應正確查詢存在的卡片', () => {
      const card = getCardById('0111')
      expect(card).toEqual(MATSU_HIKARI)
    })

    it('應正確查詢不同月份的卡片', () => {
      expect(getCardById('0111')).toEqual(MATSU_HIKARI)
      expect(getCardById('0231')).toEqual(UME_AKATAN)
      expect(getCardById('0311')).toEqual(SAKURA_HIKARI)
    })

    it('應對不存在的 card_id 返回 undefined', () => {
      expect(getCardById('9999')).toBeUndefined()
    })

    it('應對空字串返回 undefined', () => {
      expect(getCardById('')).toBeUndefined()
    })

    it('應對無效格式返回 undefined', () => {
      expect(getCardById('abc')).toBeUndefined()
      expect(getCardById('123')).toBeUndefined()
    })
  })

  describe('areCardsEqual()', () => {
    it('應對相同 card_id 的卡片返回 true', () => {
      const card1 = MATSU_HIKARI
      const card2 = { ...MATSU_HIKARI }
      expect(areCardsEqual(card1, card2)).toBe(true)
    })

    it('應對不同 card_id 的卡片返回 false', () => {
      expect(areCardsEqual(MATSU_HIKARI, UME_AKATAN)).toBe(false)
    })

    it('應基於 card_id 比較，不受其他屬性影響', () => {
      const card1: Card = {
        card_id: '0111',
        month: 1,
        type: 'BRIGHT',
        display_name: '松鶴',
      }

      const card2: Card = {
        card_id: '0111',
        month: 99, // 不同的 month
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        type: 'PLAIN' as any, // 不同的 type
        display_name: '不同名稱', // 不同的 display_name
      }

      // 只要 card_id 相同就應該返回 true
      expect(areCardsEqual(card1, card2)).toBe(true)
    })

    it('應對同一物件參照返回 true', () => {
      expect(areCardsEqual(MATSU_HIKARI, MATSU_HIKARI)).toBe(true)
    })

    it('應對多組不同卡片返回 false', () => {
      expect(areCardsEqual(MATSU_HIKARI, UME_AKATAN)).toBe(false)
      expect(areCardsEqual(UME_AKATAN, SAKURA_HIKARI)).toBe(false)
      expect(areCardsEqual(SAKURA_HIKARI, MATSU_HIKARI)).toBe(false)
    })
  })

  describe('邊界情況', () => {
    it('isValidCard() 應處理空物件', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(isValidCard({} as any)).toBe(false)
    })

    it('getCardById() 應處理特殊字元', () => {
      expect(getCardById('!@#$')).toBeUndefined()
    })

    it('areCardsEqual() 應處理 card_id 為空的情況', () => {
      const card1: Card = {
        card_id: '',
        month: 1,
        type: 'BRIGHT',
        display_name: '測試',
      }

      const card2: Card = {
        card_id: '',
        month: 1,
        type: 'BRIGHT',
        display_name: '測試',
      }

      // 空字串也應該能比較
      expect(areCardsEqual(card1, card2)).toBe(true)
    })
  })

  describe('getCardTypeFromId()', () => {
    describe('BRIGHT 牌 (type code = 1)', () => {
      it('應正確識別 1 月光牌', () => {
        expect(getCardTypeFromId('0111')).toBe('BRIGHT')
      })

      it('應正確識別 3 月光牌', () => {
        expect(getCardTypeFromId('0311')).toBe('BRIGHT')
      })

      it('應正確識別 8 月光牌', () => {
        expect(getCardTypeFromId('0811')).toBe('BRIGHT')
      })

      it('應正確識別 11 月光牌', () => {
        expect(getCardTypeFromId('1111')).toBe('BRIGHT')
      })

      it('應正確識別 12 月光牌', () => {
        expect(getCardTypeFromId('1211')).toBe('BRIGHT')
      })
    })

    describe('ANIMAL 牌 (type code = 2)', () => {
      it('應正確識別種牌', () => {
        expect(getCardTypeFromId('0221')).toBe('ANIMAL') // 2月
        expect(getCardTypeFromId('0421')).toBe('ANIMAL') // 4月
        expect(getCardTypeFromId('0721')).toBe('ANIMAL') // 7月
        expect(getCardTypeFromId('0921')).toBe('ANIMAL') // 9月
      })
    })

    describe('RIBBON 牌 (type code = 3)', () => {
      it('應正確識別短冊', () => {
        expect(getCardTypeFromId('0131')).toBe('RIBBON') // 1月
        expect(getCardTypeFromId('0231')).toBe('RIBBON') // 2月
        expect(getCardTypeFromId('0331')).toBe('RIBBON') // 3月
        expect(getCardTypeFromId('0631')).toBe('RIBBON') // 6月
      })
    })

    describe('PLAIN 牌 (type code = 4)', () => {
      it('應正確識別かす', () => {
        expect(getCardTypeFromId('0141')).toBe('PLAIN') // 1月かす1
        expect(getCardTypeFromId('0142')).toBe('PLAIN') // 1月かす2
        expect(getCardTypeFromId('0541')).toBe('PLAIN') // 5月かす
        expect(getCardTypeFromId('1241')).toBe('PLAIN') // 12月かす
      })
    })

    describe('無效格式 fallback', () => {
      it('應對空字串返回 PLAIN', () => {
        expect(getCardTypeFromId('')).toBe('PLAIN')
      })

      it('應對過短字串返回 PLAIN', () => {
        expect(getCardTypeFromId('01')).toBe('PLAIN')
      })

      it('應對無效字串返回 PLAIN', () => {
        expect(getCardTypeFromId('invalid')).toBe('PLAIN')
      })

      it('應對未知 type code 返回 PLAIN', () => {
        expect(getCardTypeFromId('0191')).toBe('PLAIN') // type code = 9
        expect(getCardTypeFromId('0101')).toBe('PLAIN') // type code = 0
      })
    })
  })

  describe('groupByCardType()', () => {
    it('應正確分組空陣列', () => {
      const result = groupByCardType([])

      expect(result.BRIGHT).toEqual([])
      expect(result.ANIMAL).toEqual([])
      expect(result.RIBBON).toEqual([])
      expect(result.PLAIN).toEqual([])
    })

    it('應正確分組單一類型的卡片', () => {
      const brightCards = ['0111', '0311', '0811'] // 3 張光牌
      const result = groupByCardType(brightCards)

      expect(result.BRIGHT).toEqual(['0111', '0311', '0811'])
      expect(result.ANIMAL).toEqual([])
      expect(result.RIBBON).toEqual([])
      expect(result.PLAIN).toEqual([])
    })

    it('應正確分組混合類型的卡片', () => {
      const mixedCards = [
        '0111', // BRIGHT - 1月光牌
        '0221', // ANIMAL - 2月種牌
        '0331', // RIBBON - 3月短冊
        '0441', // PLAIN - 4月かす
        '0811', // BRIGHT - 8月光牌
        '0921', // ANIMAL - 9月種牌
      ]

      const result = groupByCardType(mixedCards)

      expect(result.BRIGHT).toEqual(['0111', '0811'])
      expect(result.ANIMAL).toEqual(['0221', '0921'])
      expect(result.RIBBON).toEqual(['0331'])
      expect(result.PLAIN).toEqual(['0441'])
    })

    it('應保持每個分組內卡片的原始順序', () => {
      const cards = ['0811', '0111', '0311'] // 8月、1月、3月光牌（非排序順序）
      const result = groupByCardType(cards)

      // 應該保持原始順序，不重新排序
      expect(result.BRIGHT).toEqual(['0811', '0111', '0311'])
    })

    it('應正確處理完整獲得區（多種類型混合）', () => {
      // 模擬實際遊戲中可能的獲得區狀態
      const depository = [
        '0111', // BRIGHT - 松上鶴
        '0221', // ANIMAL - 梅鶯
        '0231', // RIBBON - 梅短冊
        '0141', // PLAIN - 松かす1
        '0142', // PLAIN - 松かす2
        '0311', // BRIGHT - 櫻幕
        '0921', // ANIMAL - 菊盃
      ]

      const result = groupByCardType(depository)

      expect(result.BRIGHT).toHaveLength(2)
      expect(result.ANIMAL).toHaveLength(2)
      expect(result.RIBBON).toHaveLength(1)
      expect(result.PLAIN).toHaveLength(2)
    })
  })
})
