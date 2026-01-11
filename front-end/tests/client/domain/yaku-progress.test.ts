/**
 * User Interface BC - Domain Layer 役種進度計算測試
 *
 * 測試 yaku-progress.ts 中的所有函數,確保役種進度計算邏輯正確。
 *
 * @module __tests__/game-client/domain/yaku-progress
 * @since 2025-11-14
 */

import { describe, it, expect } from 'vitest'
import {
  calculateYakuProgress,
  calculateDynamicYakuProgress,
  calculateSankoProgress,
} from '@/game-client/domain/yaku-progress'
import {
  // 赤短 (AKATAN)
  MATSU_AKATAN,
  UME_AKATAN,
  SAKURA_AKATAN,
  // 青短 (AOTAN)
  BOTAN_AOTAN,
  // 光牌 (BRIGHT)
  MATSU_HIKARI,
  SAKURA_HIKARI,
  SUSUKI_HIKARI,
  YANAGI_HIKARI,
  KIRI_HIKARI,
  // 豬鹿蝶 (INOSHIKACHO)
  HAGI_INO,
  MOMIJI_SHIKA,
  BOTAN_CHOU,
  // 月見酒 (TSUKIMI) - 芒月 + 菊盃
  // SUSUKI_HIKARI 已導入 (芒月是光牌)
  KIKU_SAKAZUKI,
  // 花見酒 (HANAMI) - 櫻幕 + 菊盃
  // SAKURA_HIKARI 已導入 (櫻幕是光牌)
  // 短冊 (TAN) - 任意短冊
  FUJI_TAN,
  AYAME_TAN,
  HAGI_TAN,
  YANAGI_TAN,
  // 種牌 (ANIMAL/TANE)
  UME_UGUISU,
  FUJI_HOTOTOGISU,
  AYAME_KAKITSUBATA,
  SUSUKI_KARI,
  YANAGI_TSUBAME,
  // かす (PLAIN/KASU)
  MATSU_KASU_1,
  MATSU_KASU_2,
  UME_KASU_1,
  UME_KASU_2,
  SAKURA_KASU_1,
  SAKURA_KASU_2,
  FUJI_KASU_1,
  FUJI_KASU_2,
  AYAME_KASU_1,
  AYAME_KASU_2,
} from '@/game-client/domain/card-database'
import type { Card } from '@/game-client/domain/types'

describe('yaku-progress.ts', () => {
  // ==========================================================================
  // calculateYakuProgress() - 固定役種
  // ==========================================================================

  describe('calculateYakuProgress() - 固定役種', () => {
    describe('赤短 (AKATAN)', () => {
      it('已有 2 張赤短,應返回 progress=66.67, missing=[SAKURA_AKATAN]', () => {
        const depositoryCards: readonly Card[] = [MATSU_AKATAN, UME_AKATAN]

        const result = calculateYakuProgress('AKATAN', depositoryCards)

        expect(result.required).toHaveLength(3)
        expect(result.obtained).toHaveLength(2)
        expect(result.obtained).toContainEqual(MATSU_AKATAN)
        expect(result.obtained).toContainEqual(UME_AKATAN)
        expect(result.missing).toHaveLength(1)
        expect(result.missing).toContainEqual(SAKURA_AKATAN)
        expect(result.progress).toBeCloseTo(66.67, 1)
      })

      it('已完成赤短 (3 張),應返回 progress=100, missing=[]', () => {
        const depositoryCards: readonly Card[] = [
          MATSU_AKATAN,
          UME_AKATAN,
          SAKURA_AKATAN,
        ]

        const result = calculateYakuProgress('AKATAN', depositoryCards)

        expect(result.obtained).toHaveLength(3)
        expect(result.missing).toHaveLength(0)
        expect(result.progress).toBe(100)
      })

      it('未獲得任何赤短,應返回 progress=0, missing=[全部 3 張]', () => {
        const depositoryCards: readonly Card[] = []

        const result = calculateYakuProgress('AKATAN', depositoryCards)

        expect(result.obtained).toHaveLength(0)
        expect(result.missing).toHaveLength(3)
        expect(result.progress).toBe(0)
      })
    })

    describe('青短 (AOTAN)', () => {
      it('已有 1 張青短,應返回 progress=33.33', () => {
        const depositoryCards: readonly Card[] = [BOTAN_AOTAN]

        const result = calculateYakuProgress('AOTAN', depositoryCards)

        expect(result.obtained).toHaveLength(1)
        expect(result.missing).toHaveLength(2)
        expect(result.progress).toBeCloseTo(33.33, 1)
      })
    })

    describe('豬鹿蝶 (INOSHIKACHO)', () => {
      it('已有 2 張種牌,應返回 progress=66.67', () => {
        const depositoryCards: readonly Card[] = [HAGI_INO, MOMIJI_SHIKA]

        const result = calculateYakuProgress('INOSHIKACHO', depositoryCards)

        expect(result.obtained).toHaveLength(2)
        expect(result.obtained).toContainEqual(HAGI_INO)
        expect(result.obtained).toContainEqual(MOMIJI_SHIKA)
        expect(result.missing).toHaveLength(1)
        expect(result.missing).toContainEqual(BOTAN_CHOU)
        expect(result.progress).toBeCloseTo(66.67, 1)
      })

      it('已完成豬鹿蝶,應返回 progress=100', () => {
        const depositoryCards: readonly Card[] = [
          HAGI_INO,
          MOMIJI_SHIKA,
          BOTAN_CHOU,
        ]

        const result = calculateYakuProgress('INOSHIKACHO', depositoryCards)

        expect(result.obtained).toHaveLength(3)
        expect(result.missing).toHaveLength(0)
        expect(result.progress).toBe(100)
      })
    })

    describe('月見酒 (TSUKIMI)', () => {
      it('已有芒月,應返回 progress=50', () => {
        const depositoryCards: readonly Card[] = [SUSUKI_HIKARI]

        const result = calculateYakuProgress('TSUKIMI', depositoryCards)

        expect(result.obtained).toHaveLength(1)
        expect(result.missing).toHaveLength(1)
        expect(result.missing).toContainEqual(KIKU_SAKAZUKI)
        expect(result.progress).toBe(50)
      })

      it('已完成月見酒,應返回 progress=100', () => {
        const depositoryCards: readonly Card[] = [
          SUSUKI_HIKARI,
          KIKU_SAKAZUKI,
        ]

        const result = calculateYakuProgress('TSUKIMI', depositoryCards)

        expect(result.obtained).toHaveLength(2)
        expect(result.missing).toHaveLength(0)
        expect(result.progress).toBe(100)
      })
    })

    describe('花見酒 (HANAMI)', () => {
      it('已有櫻幕,應返回 progress=50', () => {
        const depositoryCards: readonly Card[] = [SAKURA_HIKARI]

        const result = calculateYakuProgress('HANAMI', depositoryCards)

        expect(result.obtained).toHaveLength(1)
        expect(result.missing).toHaveLength(1)
        expect(result.missing).toContainEqual(KIKU_SAKAZUKI)
        expect(result.progress).toBe(50)
      })
    })

    describe('五光 (GOKO)', () => {
      it('已有 3 張光牌,應返回 progress=60', () => {
        const depositoryCards: readonly Card[] = [
          MATSU_HIKARI,
          SAKURA_HIKARI,
          SUSUKI_HIKARI,
        ]

        const result = calculateYakuProgress('GOKO', depositoryCards)

        expect(result.obtained).toHaveLength(3)
        expect(result.missing).toHaveLength(2)
        expect(result.progress).toBe(60)
      })

      it('已完成五光,應返回 progress=100', () => {
        const depositoryCards: readonly Card[] = [
          MATSU_HIKARI,
          SAKURA_HIKARI,
          SUSUKI_HIKARI,
          YANAGI_HIKARI,
          KIRI_HIKARI,
        ]

        const result = calculateYakuProgress('GOKO', depositoryCards)

        expect(result.obtained).toHaveLength(5)
        expect(result.missing).toHaveLength(0)
        expect(result.progress).toBe(100)
      })
    })

    describe('四光 (SHIKO)', () => {
      it('已有 2 張非雨光牌,應返回 progress=50', () => {
        const depositoryCards: readonly Card[] = [MATSU_HIKARI, SAKURA_HIKARI]

        const result = calculateYakuProgress('SHIKO', depositoryCards)

        expect(result.obtained).toHaveLength(2)
        expect(result.missing).toHaveLength(2)
        expect(result.progress).toBe(50)
      })

      it('四光不應包含雨光 (YANAGI_HIKARI)', () => {
        const depositoryCards: readonly Card[] = [
          MATSU_HIKARI,
          YANAGI_HIKARI, // 雨光
        ]

        const result = calculateYakuProgress('SHIKO', depositoryCards)

        // 四光只計算非雨光,所以只有 1 張有效
        expect(result.obtained).toHaveLength(1)
        expect(result.obtained).toContainEqual(MATSU_HIKARI)
        expect(result.obtained).not.toContainEqual(YANAGI_HIKARI)
      })
    })

    describe('雨四光 (AMESHIKO)', () => {
      it('已有雨光 + 2 張其他光牌,應返回 progress=75', () => {
        const depositoryCards: readonly Card[] = [
          YANAGI_HIKARI,
          MATSU_HIKARI,
          SAKURA_HIKARI,
        ]

        const result = calculateYakuProgress('AMESHIKO', depositoryCards)

        expect(result.obtained).toHaveLength(3)
        expect(result.progress).toBe(75)
      })
    })
  })

  // ==========================================================================
  // calculateDynamicYakuProgress() - 動態役種 (TAN, KASU, TANE)
  // ==========================================================================

  describe('calculateDynamicYakuProgress() - 動態役種', () => {
    describe('短冊 (TAN)', () => {
      it('已有 3 張短冊,應返回 progress=60% (3/5)', () => {
        const depositoryCards: readonly Card[] = [
          MATSU_AKATAN,
          UME_AKATAN,
          SAKURA_AKATAN,
        ]

        const result = calculateDynamicYakuProgress('TAN', depositoryCards)

        expect(result.obtained).toHaveLength(3)
        expect(result.progress).toBe(60)
      })

      it('已有 5 張短冊,應返回 progress=100%', () => {
        const depositoryCards: readonly Card[] = [
          MATSU_AKATAN,
          UME_AKATAN,
          SAKURA_AKATAN,
          FUJI_TAN,
          AYAME_TAN,
        ]

        const result = calculateDynamicYakuProgress('TAN', depositoryCards)

        expect(result.obtained).toHaveLength(5)
        expect(result.progress).toBe(100)
      })

      it('已有 7 張短冊,應返回 progress=100% (超過基礎需求)', () => {
        const depositoryCards: readonly Card[] = [
          MATSU_AKATAN,
          UME_AKATAN,
          SAKURA_AKATAN,
          FUJI_TAN,
          AYAME_TAN,
          HAGI_TAN,
          YANAGI_TAN,
        ]

        const result = calculateDynamicYakuProgress('TAN', depositoryCards)

        expect(result.obtained).toHaveLength(7)
        expect(result.progress).toBe(100) // 超過需求仍為 100%
      })

      it('未獲得任何短冊,應返回 progress=0', () => {
        const depositoryCards: readonly Card[] = []

        const result = calculateDynamicYakuProgress('TAN', depositoryCards)

        expect(result.obtained).toHaveLength(0)
        expect(result.progress).toBe(0)
      })
    })

    describe('かす (KASU)', () => {
      it('已有 5 張かす,應返回 progress=50% (5/10)', () => {
        const depositoryCards: readonly Card[] = [
          MATSU_KASU_1,
          MATSU_KASU_2,
          UME_KASU_1,
          UME_KASU_2,
          SAKURA_KASU_1,
        ]

        const result = calculateDynamicYakuProgress('KASU', depositoryCards)

        expect(result.obtained).toHaveLength(5)
        expect(result.progress).toBe(50)
      })

      it('已有 10 張かす,應返回 progress=100%', () => {
        const depositoryCards: readonly Card[] = [
          MATSU_KASU_1,
          MATSU_KASU_2,
          UME_KASU_1,
          UME_KASU_2,
          SAKURA_KASU_1,
          SAKURA_KASU_2,
          FUJI_KASU_1,
          FUJI_KASU_2,
          AYAME_KASU_1,
          AYAME_KASU_2,
        ]

        const result = calculateDynamicYakuProgress('KASU', depositoryCards)

        expect(result.obtained).toHaveLength(10)
        expect(result.progress).toBe(100)
      })
    })

    describe('種 (TANE)', () => {
      it('已有 3 張種牌,應返回 progress=60% (3/5)', () => {
        const depositoryCards: readonly Card[] = [
          UME_UGUISU,
          FUJI_HOTOTOGISU,
          AYAME_KAKITSUBATA,
        ]

        const result = calculateDynamicYakuProgress('TANE', depositoryCards)

        expect(result.obtained).toHaveLength(3)
        expect(result.progress).toBe(60)
      })

      it('已有 5 張種牌,應返回 progress=100%', () => {
        const depositoryCards: readonly Card[] = [
          UME_UGUISU,
          FUJI_HOTOTOGISU,
          AYAME_KAKITSUBATA,
          SUSUKI_KARI,
          YANAGI_TSUBAME,
        ]

        const result = calculateDynamicYakuProgress('TANE', depositoryCards)

        expect(result.obtained).toHaveLength(5)
        expect(result.progress).toBe(100)
      })
    })
  })

  // ==========================================================================
  // calculateSankoProgress() - 特殊役種: 三光
  // ==========================================================================

  describe('calculateSankoProgress() - 特殊役種: 三光', () => {
    it('已有 2 張非雨光牌,應返回 progress=66.67 (2/3)', () => {
      const depositoryCards: readonly Card[] = [MATSU_HIKARI, SAKURA_HIKARI]

      const result = calculateSankoProgress(depositoryCards)

      expect(result.obtained).toHaveLength(2)
      expect(result.obtained).toContainEqual(MATSU_HIKARI)
      expect(result.obtained).toContainEqual(SAKURA_HIKARI)
      expect(result.missing).toHaveLength(1)
      expect(result.progress).toBeCloseTo(66.67, 1)
    })

    it('已有 3 張非雨光牌,應返回 progress=100', () => {
      const depositoryCards: readonly Card[] = [
        MATSU_HIKARI,
        SAKURA_HIKARI,
        SUSUKI_HIKARI,
      ]

      const result = calculateSankoProgress(depositoryCards)

      expect(result.obtained).toHaveLength(3)
      expect(result.missing).toHaveLength(0)
      expect(result.progress).toBe(100)
    })

    it('已有雨光,不應計入三光進度', () => {
      const depositoryCards: readonly Card[] = [
        YANAGI_HIKARI, // 雨光 - 不計入
        MATSU_HIKARI,
      ]

      const result = calculateSankoProgress(depositoryCards)

      // 只有 1 張非雨光牌有效
      expect(result.obtained).toHaveLength(1)
      expect(result.obtained).toContainEqual(MATSU_HIKARI)
      expect(result.obtained).not.toContainEqual(YANAGI_HIKARI)
      expect(result.progress).toBeCloseTo(33.33, 1)
    })

    it('只有雨光,應返回 progress=0', () => {
      const depositoryCards: readonly Card[] = [YANAGI_HIKARI]

      const result = calculateSankoProgress(depositoryCards)

      expect(result.obtained).toHaveLength(0)
      expect(result.progress).toBe(0)
    })

    it('已有 4 張非雨光牌,應返回 progress=100 (超過需求)', () => {
      const depositoryCards: readonly Card[] = [
        MATSU_HIKARI,
        SAKURA_HIKARI,
        SUSUKI_HIKARI,
        KIRI_HIKARI,
      ]

      const result = calculateSankoProgress(depositoryCards)

      // 只需要 3 張,但已有 4 張
      expect(result.obtained).toHaveLength(4)
      expect(result.missing).toHaveLength(0)
      expect(result.progress).toBe(100)
    })

    it('未獲得任何光牌,應返回 progress=0', () => {
      const depositoryCards: readonly Card[] = []

      const result = calculateSankoProgress(depositoryCards)

      expect(result.obtained).toHaveLength(0)
      expect(result.missing).toHaveLength(3)
      expect(result.progress).toBe(0)
    })
  })

  // ==========================================================================
  // 邊界情況測試
  // ==========================================================================

  describe('邊界情況', () => {
    it('空 depositoryCards 應正確處理', () => {
      const result = calculateYakuProgress('AKATAN', [])

      expect(result.obtained).toHaveLength(0)
      expect(result.missing).toHaveLength(3)
      expect(result.progress).toBe(0)
    })

    it('depositoryCards 包含非役種相關卡片不應影響結果', () => {
      const depositoryCards: readonly Card[] = [
        MATSU_AKATAN,
        UME_KASU_1, // 非赤短卡片
        HAGI_INO, // 非赤短卡片
      ]

      const result = calculateYakuProgress('AKATAN', depositoryCards)

      expect(result.obtained).toHaveLength(1)
      expect(result.obtained).toContainEqual(MATSU_AKATAN)
      expect(result.progress).toBeCloseTo(33.33, 1)
    })
  })
})
