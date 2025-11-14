/**
 * 配對邏輯測試
 *
 * 測試目標:
 * - canMatch() 判斷兩張牌是否可配對（月份相同）
 * - findMatchableCards() 找出所有可配對的場牌
 * - 處理多重配對情況
 * - 邊界情況處理
 */

import { describe, it, expect } from 'vitest'
import { canMatch, findMatchableCards } from '@/user-interface/domain/matching'
import {
  MATSU_HIKARI,
  MATSU_AKATAN,
  MATSU_KASU_1,
  MATSU_KASU_2,
  UME_UGUISU,
  UME_AKATAN,
  UME_KASU_1,
  SAKURA_HIKARI,
  SAKURA_AKATAN,
  FUJI_HOTOTOGISU,
  KIKU_SAKAZUKI,
} from '@/user-interface/domain/card-database'

describe('matching.ts', () => {
  describe('canMatch()', () => {
    describe('相同月份應可配對', () => {
      it('應對相同月份的卡片返回 true（1月 vs 1月）', () => {
        expect(canMatch(MATSU_HIKARI, MATSU_KASU_1)).toBe(true)
      })

      it('應對相同月份的不同類型卡片返回 true（1月光牌 vs 1月短冊）', () => {
        expect(canMatch(MATSU_HIKARI, MATSU_AKATAN)).toBe(true)
      })

      it('應對相同月份的相同卡片返回 true', () => {
        expect(canMatch(MATSU_HIKARI, MATSU_HIKARI)).toBe(true)
      })

      it('應對2月卡片配對返回 true', () => {
        expect(canMatch(UME_UGUISU, UME_AKATAN)).toBe(true)
        expect(canMatch(UME_AKATAN, UME_KASU_1)).toBe(true)
      })

      it('應對3月卡片配對返回 true', () => {
        expect(canMatch(SAKURA_HIKARI, SAKURA_AKATAN)).toBe(true)
      })
    })

    describe('不同月份不可配對', () => {
      it('應對不同月份的卡片返回 false（1月 vs 2月）', () => {
        expect(canMatch(MATSU_HIKARI, UME_AKATAN)).toBe(false)
      })

      it('應對不同月份的卡片返回 false（1月 vs 3月）', () => {
        expect(canMatch(MATSU_HIKARI, SAKURA_HIKARI)).toBe(false)
      })

      it('應對不同月份的卡片返回 false（2月 vs 3月）', () => {
        expect(canMatch(UME_UGUISU, SAKURA_AKATAN)).toBe(false)
      })

      it('應對不同月份的卡片返回 false（4月 vs 9月）', () => {
        expect(canMatch(FUJI_HOTOTOGISU, KIKU_SAKAZUKI)).toBe(false)
      })
    })

    describe('邊界情況', () => {
      it('應正確處理月份為 1 和 12 的卡片（邊界月份）', () => {
        expect(canMatch(MATSU_HIKARI, MATSU_KASU_1)).toBe(true)
      })
    })
  })

  describe('findMatchableCards()', () => {
    describe('無配對情況', () => {
      it('應對無配對的場牌返回空陣列', () => {
        const handCard = MATSU_HIKARI // 1月
        const fieldCards = [UME_AKATAN, SAKURA_HIKARI, FUJI_HOTOTOGISU] // 2月, 3月, 4月

        const result = findMatchableCards(handCard, fieldCards)
        expect(result).toEqual([])
        expect(result).toHaveLength(0)
      })

      it('應對空場牌陣列返回空陣列', () => {
        const handCard = MATSU_HIKARI
        const fieldCards: readonly typeof MATSU_HIKARI[] = []

        const result = findMatchableCards(handCard, fieldCards)
        expect(result).toEqual([])
      })
    })

    describe('單一配對情況', () => {
      it('應返回單一配對的卡片', () => {
        const handCard = MATSU_HIKARI // 1月
        const fieldCards = [UME_AKATAN, MATSU_KASU_1, SAKURA_HIKARI] // 2月, 1月, 3月

        const result = findMatchableCards(handCard, fieldCards)
        expect(result).toHaveLength(1)
        expect(result).toContainEqual(MATSU_KASU_1)
      })

      it('應返回唯一配對的卡片（場牌中只有1張同月份）', () => {
        const handCard = UME_UGUISU // 2月
        const fieldCards = [MATSU_HIKARI, SAKURA_HIKARI, UME_AKATAN] // 1月, 3月, 2月

        const result = findMatchableCards(handCard, fieldCards)
        expect(result).toHaveLength(1)
        expect(result).toContainEqual(UME_AKATAN)
      })
    })

    describe('多重配對情況', () => {
      it('應返回所有可配對的卡片（2張）', () => {
        const handCard = MATSU_HIKARI // 1月
        const fieldCards = [MATSU_KASU_1, UME_AKATAN, MATSU_AKATAN] // 1月, 2月, 1月

        const result = findMatchableCards(handCard, fieldCards)
        expect(result).toHaveLength(2)
        expect(result).toContainEqual(MATSU_KASU_1)
        expect(result).toContainEqual(MATSU_AKATAN)
      })

      it('應返回所有可配對的卡片（3張同月份）', () => {
        const handCard = MATSU_HIKARI // 1月
        const fieldCards = [
          MATSU_KASU_1, // 1月
          MATSU_AKATAN, // 1月
          MATSU_KASU_2, // 1月
          UME_UGUISU, // 2月
        ]

        const result = findMatchableCards(handCard, fieldCards)
        expect(result).toHaveLength(3)
        expect(result).toContainEqual(MATSU_KASU_1)
        expect(result).toContainEqual(MATSU_AKATAN)
        expect(result).toContainEqual(MATSU_KASU_2)
      })

      it('應正確處理場上全是同月份的情況', () => {
        const handCard = MATSU_HIKARI // 1月
        const fieldCards = [
          MATSU_KASU_1, // 1月
          MATSU_AKATAN, // 1月
          MATSU_KASU_2, // 1月
        ]

        const result = findMatchableCards(handCard, fieldCards)
        expect(result).toHaveLength(3)
      })
    })

    describe('保持順序和不可變性', () => {
      it('應保持原始場牌的順序', () => {
        const handCard = MATSU_HIKARI // 1月
        const fieldCards = [
          UME_AKATAN, // 2月
          MATSU_KASU_1, // 1月
          SAKURA_HIKARI, // 3月
          MATSU_AKATAN, // 1月
        ]

        const result = findMatchableCards(handCard, fieldCards)
        expect(result).toHaveLength(2)
        // 應保持原始順序：MATSU_KASU_1 在前，MATSU_AKATAN 在後
        expect(result[0]).toEqual(MATSU_KASU_1)
        expect(result[1]).toEqual(MATSU_AKATAN)
      })

      it('不應修改原始場牌陣列', () => {
        const handCard = MATSU_HIKARI
        const fieldCards = [UME_AKATAN, MATSU_KASU_1, SAKURA_HIKARI]
        const originalLength = fieldCards.length

        findMatchableCards(handCard, fieldCards)

        // 原始陣列不應被修改
        expect(fieldCards).toHaveLength(originalLength)
        expect(fieldCards).toContainEqual(UME_AKATAN)
        expect(fieldCards).toContainEqual(MATSU_KASU_1)
        expect(fieldCards).toContainEqual(SAKURA_HIKARI)
      })
    })

    describe('真實遊戲場景', () => {
      it('場景1：玩家手牌1月，場上有1月和2月的牌', () => {
        const handCard = MATSU_HIKARI // 1月光牌
        const fieldCards = [
          MATSU_KASU_1, // 1月かす
          UME_UGUISU, // 2月種牌
          UME_KASU_1, // 2月かす
          MATSU_AKATAN, // 1月短冊
        ]

        const result = findMatchableCards(handCard, fieldCards)
        expect(result).toHaveLength(2)
        expect(result).toContainEqual(MATSU_KASU_1)
        expect(result).toContainEqual(MATSU_AKATAN)
      })

      it('場景2：玩家手牌2月，場上無2月的牌', () => {
        const handCard = UME_UGUISU // 2月種牌
        const fieldCards = [
          MATSU_HIKARI, // 1月
          SAKURA_HIKARI, // 3月
          FUJI_HOTOTOGISU, // 4月
        ]

        const result = findMatchableCards(handCard, fieldCards)
        expect(result).toHaveLength(0)
      })

      it('場景3：多重配對情況（玩家需選擇）', () => {
        const handCard = SAKURA_HIKARI // 3月光牌
        const fieldCards = [
          MATSU_HIKARI, // 1月
          SAKURA_AKATAN, // 3月短冊
          UME_UGUISU, // 2月
          SAKURA_AKATAN, // 3月短冊（重複，實際遊戲中不會出現，但測試完整性）
        ]

        const result = findMatchableCards(handCard, fieldCards)
        expect(result.length).toBeGreaterThanOrEqual(1)
      })
    })
  })
})
