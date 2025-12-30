/**
 * SpecialRulesService Tests
 *
 * @description
 * 特殊規則服務的單元測試。
 * 測試手四 (Teshi)、喰付 (Kuttsuki) 和場上手四 (Field Teshi) 的檢測。
 *
 * @module server/__tests__/domain/services/specialRulesService.test
 */

import { describe, it, expect } from 'vitest'
import {
  checkSpecialRules,
  getSpecialRulePoints,
  isSpecialRuleDraw,
  hasSpecialRuleWinner,
} from '~/server/domain/services/specialRulesService'
import type { SpecialRules } from '#shared/contracts'
import { TESHI_CARDS, KUTTSUKI_HAND, FIELD_TESHI_CARDS, HAND_STANDARD, FIELD_MIXED_CARDS } from '../../fixtures/cards'
import { createTestRound, PLAYER_1_ID, PLAYER_2_ID } from '../../fixtures/games'

describe('specialRulesService', () => {
  const enabledRules: SpecialRules = {
    teshi_enabled: true,
    kuttsuki_enabled: true,
    field_teshi_enabled: true,
  }

  const disabledRules: SpecialRules = {
    teshi_enabled: false,
    kuttsuki_enabled: false,
    field_teshi_enabled: false,
  }

  describe('checkSpecialRules', () => {
    describe('Teshi (手四)', () => {
      it('應檢測到手四，觸發者獲勝', () => {
        const round = createTestRound({
          playerStates: [
            { playerId: PLAYER_1_ID, hand: TESHI_CARDS, depository: [] },
            { playerId: PLAYER_2_ID, hand: HAND_STANDARD, depository: [] },
          ],
        })

        const result = checkSpecialRules(round, enabledRules)

        expect(result.triggered).toBe(true)
        expect(result.type).toBe('TESHI')
        expect(result.triggeredPlayerId).toBe(PLAYER_1_ID)
        expect(result.awardedPoints).toBe(6)
        expect(result.winnerId).toBe(PLAYER_1_ID) // 觸發者獲勝
        expect(result.month).toBe(1) // 1 月
        expect(result.months).toBeNull()
      })

      it('玩家 2 有手四時玩家 2 獲勝', () => {
        const round = createTestRound({
          playerStates: [
            { playerId: PLAYER_1_ID, hand: HAND_STANDARD, depository: [] },
            { playerId: PLAYER_2_ID, hand: TESHI_CARDS, depository: [] },
          ],
        })

        const result = checkSpecialRules(round, enabledRules)

        expect(result.triggered).toBe(true)
        expect(result.type).toBe('TESHI')
        expect(result.triggeredPlayerId).toBe(PLAYER_2_ID)
        expect(result.winnerId).toBe(PLAYER_2_ID) // 觸發者獲勝
      })

      it('Teshi 停用時不應檢測', () => {
        const round = createTestRound({
          playerStates: [
            { playerId: PLAYER_1_ID, hand: TESHI_CARDS, depository: [] },
            { playerId: PLAYER_2_ID, hand: HAND_STANDARD, depository: [] },
          ],
        })

        const result = checkSpecialRules(round, { ...enabledRules, teshi_enabled: false })

        expect(result.type).not.toBe('TESHI')
      })

      it('無手四時不應觸發', () => {
        const round = createTestRound({
          playerStates: [
            { playerId: PLAYER_1_ID, hand: HAND_STANDARD, depository: [] },
            { playerId: PLAYER_2_ID, hand: HAND_STANDARD, depository: [] },
          ],
        })

        const result = checkSpecialRules(round, enabledRules)

        expect(result.type).not.toBe('TESHI')
      })
    })

    describe('Kuttsuki (喰付)', () => {
      it('應檢測到喰付，觸發者獲勝', () => {
        const round = createTestRound({
          playerStates: [
            { playerId: PLAYER_1_ID, hand: KUTTSUKI_HAND, depository: [] },
            { playerId: PLAYER_2_ID, hand: HAND_STANDARD, depository: [] },
          ],
        })

        const result = checkSpecialRules(round, enabledRules)

        expect(result.triggered).toBe(true)
        expect(result.type).toBe('KUTTSUKI')
        expect(result.triggeredPlayerId).toBe(PLAYER_1_ID)
        expect(result.awardedPoints).toBe(6)
        expect(result.winnerId).toBe(PLAYER_1_ID) // 觸發者獲勝
        expect(result.month).toBeNull()
        expect(result.months).toEqual([1, 2, 3, 4]) // 4 個月份
      })

      it('玩家 2 有喰付時玩家 2 獲勝', () => {
        const round = createTestRound({
          playerStates: [
            { playerId: PLAYER_1_ID, hand: HAND_STANDARD, depository: [] },
            { playerId: PLAYER_2_ID, hand: KUTTSUKI_HAND, depository: [] },
          ],
        })

        const result = checkSpecialRules(round, enabledRules)

        expect(result.triggered).toBe(true)
        expect(result.type).toBe('KUTTSUKI')
        expect(result.winnerId).toBe(PLAYER_2_ID)
      })

      it('Kuttsuki 停用時不應檢測', () => {
        const round = createTestRound({
          playerStates: [
            { playerId: PLAYER_1_ID, hand: KUTTSUKI_HAND, depository: [] },
            { playerId: PLAYER_2_ID, hand: HAND_STANDARD, depository: [] },
          ],
        })

        const result = checkSpecialRules(round, { ...enabledRules, kuttsuki_enabled: false })

        expect(result.type).not.toBe('KUTTSUKI')
      })
    })

    describe('Field Teshi (場上手四)', () => {
      it('應檢測到場上手四，流局', () => {
        const round = createTestRound({
          field: FIELD_TESHI_CARDS,
          playerStates: [
            { playerId: PLAYER_1_ID, hand: HAND_STANDARD, depository: [] },
            { playerId: PLAYER_2_ID, hand: HAND_STANDARD, depository: [] },
          ],
        })

        const result = checkSpecialRules(round, enabledRules)

        expect(result.triggered).toBe(true)
        expect(result.type).toBe('FIELD_TESHI')
        expect(result.triggeredPlayerId).toBeNull() // 無特定觸發玩家
        expect(result.awardedPoints).toBe(0) // 流局無得分
        expect(result.winnerId).toBeNull() // 無勝者
        expect(result.month).toBe(1) // 1 月
      })

      it('Field Teshi 停用時不應檢測', () => {
        const round = createTestRound({
          field: FIELD_TESHI_CARDS,
        })

        const result = checkSpecialRules(round, { ...enabledRules, field_teshi_enabled: false })

        expect(result.type).not.toBe('FIELD_TESHI')
      })

      it('無場上手四時不應觸發', () => {
        const round = createTestRound({
          field: FIELD_MIXED_CARDS, // 正常場牌
        })

        const result = checkSpecialRules(round, enabledRules)

        expect(result.type).not.toBe('FIELD_TESHI')
      })
    })

    describe('優先順序', () => {
      it('Teshi 應優先於 Kuttsuki', () => {
        const round = createTestRound({
          playerStates: [
            { playerId: PLAYER_1_ID, hand: TESHI_CARDS, depository: [] },
            { playerId: PLAYER_2_ID, hand: KUTTSUKI_HAND, depository: [] },
          ],
        })

        const result = checkSpecialRules(round, enabledRules)

        expect(result.type).toBe('TESHI')
      })

      it('Teshi 應優先於 Field Teshi', () => {
        const round = createTestRound({
          field: FIELD_TESHI_CARDS,
          playerStates: [
            { playerId: PLAYER_1_ID, hand: TESHI_CARDS, depository: [] },
            { playerId: PLAYER_2_ID, hand: HAND_STANDARD, depository: [] },
          ],
        })

        const result = checkSpecialRules(round, enabledRules)

        expect(result.type).toBe('TESHI')
      })

      it('Kuttsuki 應優先於 Field Teshi', () => {
        const round = createTestRound({
          field: FIELD_TESHI_CARDS,
          playerStates: [
            { playerId: PLAYER_1_ID, hand: KUTTSUKI_HAND, depository: [] },
            { playerId: PLAYER_2_ID, hand: HAND_STANDARD, depository: [] },
          ],
        })

        const result = checkSpecialRules(round, enabledRules)

        expect(result.type).toBe('KUTTSUKI')
      })
    })

    describe('無特殊規則', () => {
      it('正常情況應返回未觸發', () => {
        const round = createTestRound()

        const result = checkSpecialRules(round, enabledRules)

        expect(result.triggered).toBe(false)
        expect(result.type).toBeNull()
        expect(result.triggeredPlayerId).toBeNull()
        expect(result.awardedPoints).toBe(0)
        expect(result.winnerId).toBeNull()
        expect(result.month).toBeNull()
        expect(result.months).toBeNull()
      })

      it('規則全部停用時應返回未觸發', () => {
        const round = createTestRound({
          field: FIELD_TESHI_CARDS,
          playerStates: [
            { playerId: PLAYER_1_ID, hand: TESHI_CARDS, depository: [] },
            { playerId: PLAYER_2_ID, hand: HAND_STANDARD, depository: [] },
          ],
        })

        const result = checkSpecialRules(round, disabledRules)

        expect(result.triggered).toBe(false)
      })
    })
  })

  describe('getSpecialRulePoints', () => {
    it('應返回 6', () => {
      expect(getSpecialRulePoints()).toBe(6)
    })
  })

  describe('isSpecialRuleDraw', () => {
    it('Field Teshi 應為流局', () => {
      const result = {
        triggered: true,
        type: 'FIELD_TESHI' as const,
        triggeredPlayerId: null,
        awardedPoints: 0,
        winnerId: null,
        month: 1,
        months: null,
      }

      expect(isSpecialRuleDraw(result)).toBe(true)
    })

    it('Teshi 不應為流局', () => {
      const result = {
        triggered: true,
        type: 'TESHI' as const,
        triggeredPlayerId: PLAYER_1_ID,
        awardedPoints: 6,
        winnerId: PLAYER_1_ID,
        month: 1,
        months: null,
      }

      expect(isSpecialRuleDraw(result)).toBe(false)
    })

    it('Kuttsuki 不應為流局', () => {
      const result = {
        triggered: true,
        type: 'KUTTSUKI' as const,
        triggeredPlayerId: PLAYER_1_ID,
        awardedPoints: 6,
        winnerId: PLAYER_1_ID,
        month: null,
        months: [1, 2, 3, 4],
      }

      expect(isSpecialRuleDraw(result)).toBe(false)
    })

    it('未觸發不應為流局', () => {
      const result = {
        triggered: false,
        type: null,
        triggeredPlayerId: null,
        awardedPoints: 0,
        winnerId: null,
        month: null,
        months: null,
      }

      expect(isSpecialRuleDraw(result)).toBe(false)
    })
  })

  describe('hasSpecialRuleWinner', () => {
    it('Teshi 應有勝者', () => {
      const result = {
        triggered: true,
        type: 'TESHI' as const,
        triggeredPlayerId: PLAYER_1_ID,
        awardedPoints: 6,
        winnerId: PLAYER_1_ID,
        month: 1,
        months: null,
      }

      expect(hasSpecialRuleWinner(result)).toBe(true)
    })

    it('Kuttsuki 應有勝者', () => {
      const result = {
        triggered: true,
        type: 'KUTTSUKI' as const,
        triggeredPlayerId: PLAYER_1_ID,
        awardedPoints: 6,
        winnerId: PLAYER_1_ID,
        month: null,
        months: [1, 2, 3, 4],
      }

      expect(hasSpecialRuleWinner(result)).toBe(true)
    })

    it('Field Teshi 不應有勝者', () => {
      const result = {
        triggered: true,
        type: 'FIELD_TESHI' as const,
        triggeredPlayerId: null,
        awardedPoints: 0,
        winnerId: null,
        month: 1,
        months: null,
      }

      expect(hasSpecialRuleWinner(result)).toBe(false)
    })

    it('未觸發不應有勝者', () => {
      const result = {
        triggered: false,
        type: null,
        triggeredPlayerId: null,
        awardedPoints: 0,
        winnerId: null,
        month: null,
        months: null,
      }

      expect(hasSpecialRuleWinner(result)).toBe(false)
    })
  })
})
