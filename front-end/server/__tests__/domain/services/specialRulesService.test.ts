/**
 * SpecialRulesService Tests
 *
 * @description
 * 特殊規則服務的單元測試。
 * 測試手四 (Teshi) 和喰付 (Kuttsuki) 的檢測。
 *
 * @module server/__tests__/domain/services/specialRulesService.test
 */

import { describe, it, expect } from 'vitest'
import {
  checkSpecialRules,
  getTeshiPenaltyPoints,
  isSpecialRuleDraw,
  hasSpecialRuleWinner,
} from '~/server/domain/services/specialRulesService'
import type { SpecialRules } from '#shared/contracts'
import type { Round } from '~/server/domain/round/round'
import { TESHI_CARDS, KUTTSUKI_FIELD, HAND_STANDARD, FIELD_MIXED_CARDS } from '../../fixtures/cards'
import { createTestRound, PLAYER_1_ID, PLAYER_2_ID } from '../../fixtures/games'

describe('specialRulesService', () => {
  const enabledRules: SpecialRules = {
    teshi_enabled: true,
    field_kuttsuki_enabled: true,
  }

  const disabledRules: SpecialRules = {
    teshi_enabled: false,
    field_kuttsuki_enabled: false,
  }

  describe('checkSpecialRules', () => {
    describe('Teshi (手四)', () => {
      it('應檢測到手四', () => {
        const round = createTestRound({
          playerStates: [
            { playerId: PLAYER_1_ID, hand: TESHI_CARDS, depository: [] },
            { playerId: PLAYER_2_ID, hand: HAND_STANDARD, depository: [] },
          ],
        })

        const result = checkSpecialRules(round, enabledRules)

        expect(result.triggered).toBe(true)
        expect(result.type).toBe('TESHI')
        expect(result.affectedPlayerId).toBe(PLAYER_1_ID)
        expect(result.awardedPoints).toBe(6)
        expect(result.winnerId).toBe(PLAYER_2_ID) // 對手獲勝
        expect(result.month).toBe(1) // 1 月
      })

      it('玩家 2 有手四時對手（玩家 1）獲勝', () => {
        const round = createTestRound({
          playerStates: [
            { playerId: PLAYER_1_ID, hand: HAND_STANDARD, depository: [] },
            { playerId: PLAYER_2_ID, hand: TESHI_CARDS, depository: [] },
          ],
        })

        const result = checkSpecialRules(round, enabledRules)

        expect(result.triggered).toBe(true)
        expect(result.type).toBe('TESHI')
        expect(result.affectedPlayerId).toBe(PLAYER_2_ID)
        expect(result.winnerId).toBe(PLAYER_1_ID)
      })

      it('Teshi 停用時不應檢測', () => {
        const round = createTestRound({
          playerStates: [
            { playerId: PLAYER_1_ID, hand: TESHI_CARDS, depository: [] },
            { playerId: PLAYER_2_ID, hand: HAND_STANDARD, depository: [] },
          ],
        })

        const result = checkSpecialRules(round, { ...enabledRules, teshi_enabled: false })

        expect(result.triggered).toBe(false)
        expect(result.type).toBeNull()
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
      it('應檢測到喰付', () => {
        const round = createTestRound({
          field: KUTTSUKI_FIELD,
          playerStates: [
            { playerId: PLAYER_1_ID, hand: HAND_STANDARD, depository: [] },
            { playerId: PLAYER_2_ID, hand: HAND_STANDARD, depository: [] },
          ],
        })

        const result = checkSpecialRules(round, enabledRules)

        expect(result.triggered).toBe(true)
        expect(result.type).toBe('FIELD_KUTTSUKI')
        expect(result.affectedPlayerId).toBeNull() // 無特定受影響玩家
        expect(result.awardedPoints).toBe(0) // 流局無得分
        expect(result.winnerId).toBeNull() // 無勝者
      })

      it('Kuttsuki 停用時不應檢測', () => {
        const round = createTestRound({
          field: KUTTSUKI_FIELD,
        })

        const result = checkSpecialRules(round, { ...enabledRules, field_kuttsuki_enabled: false })

        expect(result.type).not.toBe('FIELD_KUTTSUKI')
      })

      it('無喰付時不應觸發', () => {
        const round = createTestRound({
          field: FIELD_MIXED_CARDS, // 正常場牌
        })

        const result = checkSpecialRules(round, enabledRules)

        expect(result.type).not.toBe('FIELD_KUTTSUKI')
      })
    })

    describe('優先順序', () => {
      it('Teshi 應優先於 Kuttsuki', () => {
        const round = createTestRound({
          field: KUTTSUKI_FIELD,
          playerStates: [
            { playerId: PLAYER_1_ID, hand: TESHI_CARDS, depository: [] },
            { playerId: PLAYER_2_ID, hand: HAND_STANDARD, depository: [] },
          ],
        })

        const result = checkSpecialRules(round, enabledRules)

        // Teshi 優先檢測
        expect(result.type).toBe('TESHI')
      })
    })

    describe('無特殊規則', () => {
      it('正常情況應返回未觸發', () => {
        const round = createTestRound()

        const result = checkSpecialRules(round, enabledRules)

        expect(result.triggered).toBe(false)
        expect(result.type).toBeNull()
        expect(result.affectedPlayerId).toBeNull()
        expect(result.awardedPoints).toBe(0)
        expect(result.winnerId).toBeNull()
        expect(result.month).toBeNull()
      })

      it('規則全部停用時應返回未觸發', () => {
        const round = createTestRound({
          field: KUTTSUKI_FIELD,
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

  describe('getTeshiPenaltyPoints', () => {
    it('應返回 6', () => {
      expect(getTeshiPenaltyPoints()).toBe(6)
    })
  })

  describe('isSpecialRuleDraw', () => {
    it('Kuttsuki 應為流局', () => {
      const result = {
        triggered: true,
        type: 'FIELD_KUTTSUKI' as const,
        affectedPlayerId: null,
        awardedPoints: 0,
        winnerId: null,
        month: 1,
      }

      expect(isSpecialRuleDraw(result)).toBe(true)
    })

    it('Teshi 不應為流局', () => {
      const result = {
        triggered: true,
        type: 'TESHI' as const,
        affectedPlayerId: PLAYER_1_ID,
        awardedPoints: 6,
        winnerId: PLAYER_2_ID,
        month: 1,
      }

      expect(isSpecialRuleDraw(result)).toBe(false)
    })

    it('未觸發不應為流局', () => {
      const result = {
        triggered: false,
        type: null,
        affectedPlayerId: null,
        awardedPoints: 0,
        winnerId: null,
        month: null,
      }

      expect(isSpecialRuleDraw(result)).toBe(false)
    })
  })

  describe('hasSpecialRuleWinner', () => {
    it('Teshi 應有勝者', () => {
      const result = {
        triggered: true,
        type: 'TESHI' as const,
        affectedPlayerId: PLAYER_1_ID,
        awardedPoints: 6,
        winnerId: PLAYER_2_ID,
        month: 1,
      }

      expect(hasSpecialRuleWinner(result)).toBe(true)
    })

    it('Kuttsuki 不應有勝者', () => {
      const result = {
        triggered: true,
        type: 'FIELD_KUTTSUKI' as const,
        affectedPlayerId: null,
        awardedPoints: 0,
        winnerId: null,
        month: 1,
      }

      expect(hasSpecialRuleWinner(result)).toBe(false)
    })

    it('未觸發不應有勝者', () => {
      const result = {
        triggered: false,
        type: null,
        affectedPlayerId: null,
        awardedPoints: 0,
        winnerId: null,
        month: null,
      }

      expect(hasSpecialRuleWinner(result)).toBe(false)
    })
  })
})
