/**
 * YakuDetectionService Tests
 *
 * @description
 * 役種檢測服務的單元測試。
 * 測試所有 12 種標準役種的檢測邏輯。
 *
 * @module server/__tests__/domain/services/yakuDetectionService.test
 */

import { describe, it, expect } from 'vitest'
import {
  detectYaku,
  detectNewYaku,
  calculateYakuTotalPoints,
  createDefaultYakuSettings,
  DEFAULT_YAKU_POINTS,
  HIKARI_CARDS,
  TANE_CARDS,
  TANZAKU_CARDS,
  KASU_CARDS,
} from '~/server/core-game/domain/services/yakuDetectionService'
import {
  GOKOU_CARDS,
  SHIKOU_CARDS,
  AME_SHIKOU_CARDS,
  SANKOU_CARDS,
  INOSHIKACHO_CARDS,
  HANAMI_ZAKE_CARDS,
  TSUKIMI_ZAKE_CARDS,
  AKATAN_CARDS,
  AOTAN_CARDS,
  TANZAKU_5_CARDS,
  TANZAKU_7_CARDS,
  TANE_5_CARDS,
  TANE_6_CARDS,
  KASU_10_CARDS,
  KASU_12_CARDS,
  EMPTY_DEPOSITORY,
  NO_YAKU_CARDS,
} from '../../fixtures/cards'
import { DEFAULT_YAKU_SETTINGS } from '../../fixtures/games'

describe('yakuDetectionService', () => {
  describe('detectYaku', () => {
    // ============================================================
    // 光牌系役種
    // ============================================================
    describe('光牌系役種 (Hikari)', () => {
      it('應檢測到五光 (GOKOU) - 5 張光牌', () => {
        const result = detectYaku(GOKOU_CARDS, DEFAULT_YAKU_SETTINGS)

        expect(result).toHaveLength(1)
        expect(result[0]).toMatchObject({
          yaku_type: 'GOKOU',
          base_points: 15,
        })
        expect(result[0]?.contributing_cards).toHaveLength(5)
      })

      it('應檢測到四光 (SHIKOU) - 4 張光牌不含雨', () => {
        const result = detectYaku(SHIKOU_CARDS, DEFAULT_YAKU_SETTINGS)

        expect(result).toHaveLength(1)
        expect(result[0]).toMatchObject({
          yaku_type: 'SHIKOU',
          base_points: 10,
        })
        expect(result[0]?.contributing_cards).toHaveLength(4)
      })

      it('應檢測到雨四光 (AME_SHIKOU) - 4 張光牌含雨', () => {
        const result = detectYaku(AME_SHIKOU_CARDS, DEFAULT_YAKU_SETTINGS)

        expect(result).toHaveLength(1)
        expect(result[0]).toMatchObject({
          yaku_type: 'AME_SHIKOU',
          base_points: 8,
        })
        expect(result[0]?.contributing_cards).toHaveLength(4)
      })

      it('應檢測到三光 (SANKOU) - 3 張光牌不含雨', () => {
        const result = detectYaku(SANKOU_CARDS, DEFAULT_YAKU_SETTINGS)

        expect(result).toHaveLength(1)
        expect(result[0]).toMatchObject({
          yaku_type: 'SANKOU',
          base_points: 6,
        })
        expect(result[0]?.contributing_cards).toHaveLength(3)
      })

      it('3 張光牌含雨時不應檢測到三光', () => {
        // 3 張光牌但包含雨牌 (1111)
        const cardsWithRain = ['0111', '0311', '1111']
        const result = detectYaku(cardsWithRain, DEFAULT_YAKU_SETTINGS)

        const sankou = result.find((y) => y.yaku_type === 'SANKOU')
        expect(sankou).toBeUndefined()
      })

      it('光牌系役種應互斥 - 只取最高分', () => {
        // 五光時不應同時有四光、三光
        const result = detectYaku(GOKOU_CARDS, DEFAULT_YAKU_SETTINGS)
        const hikariYaku = result.filter((y) =>
          ['GOKOU', 'SHIKOU', 'AME_SHIKOU', 'SANKOU'].includes(y.yaku_type)
        )

        expect(hikariYaku).toHaveLength(1)
        expect(hikariYaku[0]?.yaku_type).toBe('GOKOU')
      })
    })

    // ============================================================
    // 種牌系役種
    // ============================================================
    describe('種牌系役種 (Tane)', () => {
      it('應檢測到豬鹿蝶 (INOSHIKACHO)', () => {
        const result = detectYaku(INOSHIKACHO_CARDS, DEFAULT_YAKU_SETTINGS)

        const inoshikacho = result.find((y) => y.yaku_type === 'INOSHIKACHO')
        expect(inoshikacho).toBeDefined()
        expect(inoshikacho?.base_points).toBe(5)
        expect(inoshikacho?.contributing_cards).toHaveLength(3)
      })

      it('應檢測到花見酒 (HANAMI_ZAKE) - 櫻幕 + 菊盃', () => {
        const result = detectYaku(HANAMI_ZAKE_CARDS, DEFAULT_YAKU_SETTINGS)

        const hanami = result.find((y) => y.yaku_type === 'HANAMI_ZAKE')
        expect(hanami).toBeDefined()
        expect(hanami?.base_points).toBe(3)
        expect(hanami?.contributing_cards).toHaveLength(2)
      })

      it('應檢測到月見酒 (TSUKIMI_ZAKE) - 芒月 + 菊盃', () => {
        const result = detectYaku(TSUKIMI_ZAKE_CARDS, DEFAULT_YAKU_SETTINGS)

        const tsukimi = result.find((y) => y.yaku_type === 'TSUKIMI_ZAKE')
        expect(tsukimi).toBeDefined()
        expect(tsukimi?.base_points).toBe(3)
        expect(tsukimi?.contributing_cards).toHaveLength(2)
      })

      it('應檢測到種役 (TANE) - 5 張種牌', () => {
        const result = detectYaku(TANE_5_CARDS, DEFAULT_YAKU_SETTINGS)

        const tane = result.find((y) => y.yaku_type === 'TANE')
        expect(tane).toBeDefined()
        expect(tane?.base_points).toBe(1) // 基礎 1 點
        expect(tane?.contributing_cards).toHaveLength(5)
      })

      it('種役應計算加分 - 6 張種牌 = 2 點', () => {
        const result = detectYaku(TANE_6_CARDS, DEFAULT_YAKU_SETTINGS)

        const tane = result.find((y) => y.yaku_type === 'TANE')
        expect(tane).toBeDefined()
        expect(tane?.base_points).toBe(2) // 基礎 1 點 + 1 張額外
        expect(tane?.contributing_cards).toHaveLength(6)
      })

      it('4 張種牌不應成立種役', () => {
        const fourTane = TANE_5_CARDS.slice(0, 4)
        const result = detectYaku(fourTane, DEFAULT_YAKU_SETTINGS)

        const tane = result.find((y) => y.yaku_type === 'TANE')
        expect(tane).toBeUndefined()
      })
    })

    // ============================================================
    // 短冊系役種
    // ============================================================
    describe('短冊系役種 (Tanzaku)', () => {
      it('應檢測到赤短 (AKATAN) - 3 張赤短', () => {
        const result = detectYaku(AKATAN_CARDS, DEFAULT_YAKU_SETTINGS)

        const akatan = result.find((y) => y.yaku_type === 'AKATAN')
        expect(akatan).toBeDefined()
        expect(akatan?.base_points).toBe(5)
        expect(akatan?.contributing_cards).toHaveLength(3)
      })

      it('應檢測到青短 (AOTAN) - 3 張青短', () => {
        const result = detectYaku(AOTAN_CARDS, DEFAULT_YAKU_SETTINGS)

        const aotan = result.find((y) => y.yaku_type === 'AOTAN')
        expect(aotan).toBeDefined()
        expect(aotan?.base_points).toBe(5)
        expect(aotan?.contributing_cards).toHaveLength(3)
      })

      it('應檢測到短冊役 (TANZAKU) - 5 張短冊', () => {
        const result = detectYaku(TANZAKU_5_CARDS, DEFAULT_YAKU_SETTINGS)

        const tanzaku = result.find((y) => y.yaku_type === 'TANZAKU')
        expect(tanzaku).toBeDefined()
        expect(tanzaku?.base_points).toBe(1) // 基礎 1 點
        expect(tanzaku?.contributing_cards).toHaveLength(5)
      })

      it('短冊役應計算加分 - 7 張短冊 = 3 點', () => {
        const result = detectYaku(TANZAKU_7_CARDS, DEFAULT_YAKU_SETTINGS)

        const tanzaku = result.find((y) => y.yaku_type === 'TANZAKU')
        expect(tanzaku).toBeDefined()
        expect(tanzaku?.base_points).toBe(3) // 基礎 1 點 + 2 張額外
        expect(tanzaku?.contributing_cards).toHaveLength(7)
      })

      it('赤短和短冊役可同時成立', () => {
        // 赤短 3 張 + 額外 2 張短冊 = 5 張短冊
        const result = detectYaku(TANZAKU_5_CARDS, DEFAULT_YAKU_SETTINGS)

        const akatan = result.find((y) => y.yaku_type === 'AKATAN')
        const tanzaku = result.find((y) => y.yaku_type === 'TANZAKU')

        expect(akatan).toBeDefined()
        expect(tanzaku).toBeDefined()
      })
    })

    // ============================================================
    // かす系役種
    // ============================================================
    describe('かす系役種 (Kasu)', () => {
      it('應檢測到かす役 (KASU) - 10 張かす', () => {
        const result = detectYaku(KASU_10_CARDS, DEFAULT_YAKU_SETTINGS)

        const kasu = result.find((y) => y.yaku_type === 'KASU')
        expect(kasu).toBeDefined()
        expect(kasu?.base_points).toBe(1) // 基礎 1 點
        expect(kasu?.contributing_cards).toHaveLength(10)
      })

      it('かす役應計算加分 - 12 張かす = 3 點', () => {
        const result = detectYaku(KASU_12_CARDS, DEFAULT_YAKU_SETTINGS)

        const kasu = result.find((y) => y.yaku_type === 'KASU')
        expect(kasu).toBeDefined()
        expect(kasu?.base_points).toBe(3) // 基礎 1 點 + 2 張額外
        expect(kasu?.contributing_cards).toHaveLength(12)
      })

      it('9 張かす不應成立かす役', () => {
        const nineKasu = KASU_10_CARDS.slice(0, 9)
        const result = detectYaku(nineKasu, DEFAULT_YAKU_SETTINGS)

        const kasu = result.find((y) => y.yaku_type === 'KASU')
        expect(kasu).toBeUndefined()
      })
    })

    // ============================================================
    // 邊界情況
    // ============================================================
    describe('邊界情況', () => {
      it('空獲得區應返回空陣列', () => {
        const result = detectYaku(EMPTY_DEPOSITORY, DEFAULT_YAKU_SETTINGS)
        expect(result).toHaveLength(0)
      })

      it('無法成立役的組合應返回空陣列', () => {
        const result = detectYaku(NO_YAKU_CARDS, DEFAULT_YAKU_SETTINGS)
        expect(result).toHaveLength(0)
      })

      it('多個役種可同時成立', () => {
        // 五光 + 豬鹿蝶 + 花見酒 + 月見酒
        const multiYakuCards = [
          ...GOKOU_CARDS,
          ...INOSHIKACHO_CARDS,
          '0921', // 菊盃（花見酒、月見酒共用）
        ]
        const result = detectYaku(multiYakuCards, DEFAULT_YAKU_SETTINGS)

        const yakuTypes = result.map((y) => y.yaku_type)
        expect(yakuTypes).toContain('GOKOU')
        expect(yakuTypes).toContain('INOSHIKACHO')
        expect(yakuTypes).toContain('HANAMI_ZAKE')
        expect(yakuTypes).toContain('TSUKIMI_ZAKE')
      })
    })

    // ============================================================
    // 役種啟用/停用
    // ============================================================
    describe('役種啟用/停用', () => {
      it('停用的役種不應被檢測', () => {
        const disabledSettings = DEFAULT_YAKU_SETTINGS.map((s) =>
          s.yaku_type === 'GOKOU' ? { ...s, enabled: false } : s
        )

        const result = detectYaku(GOKOU_CARDS, disabledSettings)
        const gokou = result.find((y) => y.yaku_type === 'GOKOU')

        expect(gokou).toBeUndefined()
      })

      it('自訂分數應被使用', () => {
        const customSettings = DEFAULT_YAKU_SETTINGS.map((s) =>
          s.yaku_type === 'AKATAN' ? { ...s, base_points: 10 } : s
        )

        const result = detectYaku(AKATAN_CARDS, customSettings)
        const akatan = result.find((y) => y.yaku_type === 'AKATAN')

        expect(akatan?.base_points).toBe(10)
      })
    })
  })

  describe('detectNewYaku', () => {
    it('應檢測新形成的役種', () => {
      const previousYaku = [
        { yaku_type: 'AKATAN' as const, base_points: 5, contributing_cards: AKATAN_CARDS },
      ]
      const currentYaku = [
        { yaku_type: 'AKATAN' as const, base_points: 5, contributing_cards: AKATAN_CARDS },
        { yaku_type: 'AOTAN' as const, base_points: 5, contributing_cards: AOTAN_CARDS },
      ]

      const newYaku = detectNewYaku(previousYaku, currentYaku)

      expect(newYaku).toHaveLength(1)
      expect(newYaku[0]?.yaku_type).toBe('AOTAN')
    })

    it('應檢測役種升級（分數提高）', () => {
      const previousYaku = [
        { yaku_type: 'TANE' as const, base_points: 1, contributing_cards: TANE_5_CARDS },
      ]
      const currentYaku = [
        { yaku_type: 'TANE' as const, base_points: 2, contributing_cards: TANE_6_CARDS },
      ]

      const newYaku = detectNewYaku(previousYaku, currentYaku)

      expect(newYaku).toHaveLength(1)
      expect(newYaku[0]?.yaku_type).toBe('TANE')
      expect(newYaku[0]?.base_points).toBe(2)
    })

    it('無新役種時應返回空陣列', () => {
      const sameYaku = [
        { yaku_type: 'AKATAN' as const, base_points: 5, contributing_cards: AKATAN_CARDS },
      ]

      const newYaku = detectNewYaku(sameYaku, sameYaku)

      expect(newYaku).toHaveLength(0)
    })
  })

  describe('calculateYakuTotalPoints', () => {
    it('應計算單一役種的分數', () => {
      const yakuList = [
        { yaku_type: 'GOKOU' as const, base_points: 15, contributing_cards: GOKOU_CARDS },
      ]

      const total = calculateYakuTotalPoints(yakuList)

      expect(total).toBe(15)
    })

    it('應計算多個役種的總分', () => {
      const yakuList = [
        { yaku_type: 'AKATAN' as const, base_points: 5, contributing_cards: AKATAN_CARDS },
        { yaku_type: 'AOTAN' as const, base_points: 5, contributing_cards: AOTAN_CARDS },
        { yaku_type: 'TANZAKU' as const, base_points: 3, contributing_cards: TANZAKU_7_CARDS },
      ]

      const total = calculateYakuTotalPoints(yakuList)

      expect(total).toBe(13) // 5 + 5 + 3
    })

    it('空役種列表應返回 0', () => {
      const total = calculateYakuTotalPoints([])

      expect(total).toBe(0)
    })
  })

  describe('createDefaultYakuSettings', () => {
    it('應建立 12 種役種的預設設定', () => {
      const settings = createDefaultYakuSettings()

      expect(settings).toHaveLength(12)
    })

    it('所有役種預設應為啟用', () => {
      const settings = createDefaultYakuSettings()

      settings.forEach((s) => {
        expect(s.enabled).toBe(true)
      })
    })

    it('分數應與 DEFAULT_YAKU_POINTS 一致', () => {
      const settings = createDefaultYakuSettings()

      settings.forEach((s) => {
        expect(s.base_points).toBe(DEFAULT_YAKU_POINTS[s.yaku_type as keyof typeof DEFAULT_YAKU_POINTS])
      })
    })
  })

  describe('卡片常數驗證', () => {
    it('HIKARI_CARDS 應有 5 張', () => {
      expect(HIKARI_CARDS).toHaveLength(5)
    })

    it('TANE_CARDS 應有 9 張', () => {
      // 注意：TANE_CARDS 在 yakuDetectionService 中定義為 9 張
      // 菊盃 (0921) 不在 TANE_CARDS 中，但會被計算
      expect(TANE_CARDS).toHaveLength(9)
    })

    it('TANZAKU_CARDS 應有 10 張', () => {
      expect(TANZAKU_CARDS).toHaveLength(10)
    })

    it('KASU_CARDS 應有 24 張', () => {
      expect(KASU_CARDS).toHaveLength(24)
    })
  })
})
