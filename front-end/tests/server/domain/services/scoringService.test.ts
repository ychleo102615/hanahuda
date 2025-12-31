/**
 * ScoringService Tests
 *
 * @description
 * 計分服務的單元測試。
 * 測試基礎分數計算、Koi-Koi 倍率和 7 點翻倍規則。
 *
 * @module server/__tests__/domain/services/scoringService.test
 */

import { describe, it, expect } from 'vitest'
import {
  calculateBaseScore,
  calculateFinalScore,
  calculateScoreFromYaku,
  getDoubleScoreThreshold,
} from '~/server/domain/services/scoringService'
import type { Yaku } from '#shared/contracts'
import type { KoiStatus } from '~/server/domain/round/koiStatus'
import { GOKOU_CARDS, AKATAN_CARDS, AOTAN_CARDS } from '../../fixtures/cards'

describe('scoringService', () => {
  describe('calculateBaseScore', () => {
    it('單一役種應返回該役種的分數', () => {
      const yakuList: Yaku[] = [
        { yaku_type: 'GOKOU', base_points: 15, contributing_cards: GOKOU_CARDS },
      ]

      const score = calculateBaseScore(yakuList)

      expect(score).toBe(15)
    })

    it('多個役種應返回總分', () => {
      const yakuList: Yaku[] = [
        { yaku_type: 'AKATAN', base_points: 5, contributing_cards: AKATAN_CARDS },
        { yaku_type: 'AOTAN', base_points: 5, contributing_cards: AOTAN_CARDS },
      ]

      const score = calculateBaseScore(yakuList)

      expect(score).toBe(10)
    })

    it('空役種列表應返回 0', () => {
      const score = calculateBaseScore([])

      expect(score).toBe(0)
    })
  })

  describe('calculateFinalScore', () => {
    describe('無 Koi-Koi 宣告', () => {
      it('基礎分數 < 7 時不翻倍', () => {
        const result = calculateFinalScore(5, false)

        expect(result.baseScore).toBe(5)
        expect(result.koiMultiplier).toBe(1)
        expect(result.koiKoiApplied).toBe(false)
        expect(result.isDoubled).toBe(false)
        expect(result.finalScore).toBe(5)
      })

      it('基礎分數 = 7 時應翻倍', () => {
        const result = calculateFinalScore(7, false)

        expect(result.baseScore).toBe(7)
        expect(result.koiMultiplier).toBe(1)
        expect(result.isDoubled).toBe(true)
        expect(result.finalScore).toBe(14) // 7 * 2
      })

      it('基礎分數 > 7 時應翻倍', () => {
        const result = calculateFinalScore(15, false)

        expect(result.baseScore).toBe(15)
        expect(result.koiMultiplier).toBe(1)
        expect(result.isDoubled).toBe(true)
        expect(result.finalScore).toBe(30) // 15 * 2
      })
    })

    describe('有 Koi-Koi 宣告', () => {
      it('基礎分數 < 7 時只套用 Koi-Koi 倍率', () => {
        const result = calculateFinalScore(5, true)

        expect(result.baseScore).toBe(5)
        expect(result.koiMultiplier).toBe(2)
        expect(result.koiKoiApplied).toBe(true)
        expect(result.isDoubled).toBe(false)
        expect(result.finalScore).toBe(10) // 5 * 2
      })

      it('基礎分數 >= 7 時應同時套用兩個倍率', () => {
        const result = calculateFinalScore(7, true)

        expect(result.baseScore).toBe(7)
        expect(result.koiMultiplier).toBe(2)
        expect(result.koiKoiApplied).toBe(true)
        expect(result.isDoubled).toBe(true)
        expect(result.finalScore).toBe(28) // 7 * 2 * 2
      })

      it('高分情況應正確計算', () => {
        const result = calculateFinalScore(15, true)

        expect(result.baseScore).toBe(15)
        expect(result.koiMultiplier).toBe(2)
        expect(result.koiKoiApplied).toBe(true)
        expect(result.isDoubled).toBe(true)
        expect(result.finalScore).toBe(60) // 15 * 2 * 2
      })
    })

    describe('邊界情況', () => {
      it('分數為 0 時應正確處理', () => {
        const result = calculateFinalScore(0, false)

        expect(result.baseScore).toBe(0)
        expect(result.finalScore).toBe(0)
      })

      it('分數為 6 時不應翻倍', () => {
        const result = calculateFinalScore(6, false)

        expect(result.isDoubled).toBe(false)
        expect(result.finalScore).toBe(6)
      })
    })
  })

  describe('calculateScoreFromYaku', () => {
    it('無人宣告 Koi-Koi 時應使用基礎倍率', () => {
      const yakuList: Yaku[] = [
        { yaku_type: 'AKATAN', base_points: 5, contributing_cards: AKATAN_CARDS },
      ]
      const koiStatuses: KoiStatus[] = [
        { player_id: 'player-1', times_continued: 0, last_yaku_snapshot: [] },
        { player_id: 'player-2', times_continued: 0, last_yaku_snapshot: [] },
      ]

      const result = calculateScoreFromYaku(yakuList, koiStatuses)

      expect(result.koiKoiApplied).toBe(false)
      expect(result.koiMultiplier).toBe(1)
      expect(result.finalScore).toBe(5)
    })

    it('有人宣告 Koi-Koi 時應套用倍率', () => {
      const yakuList: Yaku[] = [
        { yaku_type: 'AKATAN', base_points: 5, contributing_cards: AKATAN_CARDS },
      ]
      const koiStatuses: KoiStatus[] = [
        { player_id: 'player-1', times_continued: 1, last_yaku_snapshot: [] },
        { player_id: 'player-2', times_continued: 0, last_yaku_snapshot: [] },
      ]

      const result = calculateScoreFromYaku(yakuList, koiStatuses)

      expect(result.koiKoiApplied).toBe(true)
      expect(result.koiMultiplier).toBe(2)
      expect(result.finalScore).toBe(10) // 5 * 2
    })

    it('雙方都宣告 Koi-Koi 時倍率相同', () => {
      const yakuList: Yaku[] = [
        { yaku_type: 'AKATAN', base_points: 5, contributing_cards: AKATAN_CARDS },
      ]
      const koiStatuses: KoiStatus[] = [
        { player_id: 'player-1', times_continued: 2, last_yaku_snapshot: [] },
        { player_id: 'player-2', times_continued: 1, last_yaku_snapshot: [] },
      ]

      const result = calculateScoreFromYaku(yakuList, koiStatuses)

      // 根據規則，只要有人宣告過就是 2 倍（不累加）
      expect(result.koiKoiApplied).toBe(true)
      expect(result.koiMultiplier).toBe(2)
      expect(result.finalScore).toBe(10)
    })

    it('高分 + Koi-Koi 組合應正確計算', () => {
      const yakuList: Yaku[] = [
        { yaku_type: 'GOKOU', base_points: 15, contributing_cards: GOKOU_CARDS },
      ]
      const koiStatuses: KoiStatus[] = [
        { player_id: 'player-1', times_continued: 1, last_yaku_snapshot: [] },
        { player_id: 'player-2', times_continued: 0, last_yaku_snapshot: [] },
      ]

      const result = calculateScoreFromYaku(yakuList, koiStatuses)

      expect(result.baseScore).toBe(15)
      expect(result.koiMultiplier).toBe(2)
      expect(result.isDoubled).toBe(true)
      expect(result.finalScore).toBe(60) // 15 * 2 * 2
    })
  })

  describe('getDoubleScoreThreshold', () => {
    it('應返回 7', () => {
      const threshold = getDoubleScoreThreshold()

      expect(threshold).toBe(7)
    })
  })
})
