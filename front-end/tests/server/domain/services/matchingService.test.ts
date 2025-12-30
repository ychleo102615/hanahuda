/**
 * MatchingService Tests
 *
 * @description
 * 配對服務的單元測試。
 * 測試卡片配對邏輯、配對分析和收牌操作。
 *
 * @module server/__tests__/domain/services/matchingService.test
 */

import { describe, it, expect } from 'vitest'
import {
  canMatch,
  findMatchableTargets,
  analyzeMatch,
  executeCaptureFromMatch,
  removeFromField,
  addToField,
  type MatchResult,
} from '~/server/domain/services/matchingService'
import { FIELD_MIXED_CARDS } from '../../fixtures/cards'

describe('matchingService', () => {
  describe('canMatch', () => {
    it('同月份的牌應可配對', () => {
      const result = canMatch('0111', '0131') // 都是 1 月
      expect(result).toBe(true)
    })

    it('不同月份的牌不應配對', () => {
      const result = canMatch('0111', '0211') // 1 月 vs 2 月
      expect(result).toBe(false)
    })

    it('相同牌應可配對', () => {
      const result = canMatch('0111', '0111')
      expect(result).toBe(true)
    })
  })

  describe('findMatchableTargets', () => {
    it('應找到所有同月份的場牌', () => {
      // 場上有 1 月的 0131
      const result = findMatchableTargets('0111', FIELD_MIXED_CARDS)
      expect(result).toContain('0131')
      expect(result).toHaveLength(1)
    })

    it('無配對時應返回空陣列', () => {
      // 場上沒有 9 月的牌
      const result = findMatchableTargets('0921', FIELD_MIXED_CARDS)
      expect(result).toHaveLength(0)
    })

    it('應找到多張同月份的場牌', () => {
      // 場上有 1 月的多張牌
      const fieldWith3January = ['0111', '0131', '0141', '0241']
      const result = findMatchableTargets('0142', fieldWith3January)

      expect(result).toContain('0111')
      expect(result).toContain('0131')
      expect(result).toContain('0141')
      expect(result).toHaveLength(3)
    })

    it('空場時應返回空陣列', () => {
      const result = findMatchableTargets('0111', [])
      expect(result).toHaveLength(0)
    })
  })

  describe('analyzeMatch', () => {
    it('無配對時應返回 NO_MATCH', () => {
      const result = analyzeMatch('0921', FIELD_MIXED_CARDS)

      expect(result.type).toBe('NO_MATCH')
    })

    it('單配對時應返回 SINGLE_MATCH', () => {
      const result = analyzeMatch('0111', FIELD_MIXED_CARDS)

      expect(result.type).toBe('SINGLE_MATCH')
      if (result.type === 'SINGLE_MATCH') {
        expect(result.target).toBe('0131')
      }
    })

    it('雙配對時應返回 DOUBLE_MATCH', () => {
      const fieldWith2January = ['0131', '0141', '0241']
      const result = analyzeMatch('0111', fieldWith2January)

      expect(result.type).toBe('DOUBLE_MATCH')
      if (result.type === 'DOUBLE_MATCH') {
        expect(result.targets).toContain('0131')
        expect(result.targets).toContain('0141')
        expect(result.targets).toHaveLength(2)
      }
    })

    it('三配對時應返回 TRIPLE_MATCH', () => {
      const fieldWith3January = ['0131', '0141', '0142', '0241']
      const result = analyzeMatch('0111', fieldWith3January)

      expect(result.type).toBe('TRIPLE_MATCH')
      if (result.type === 'TRIPLE_MATCH') {
        expect(result.targets).toContain('0131')
        expect(result.targets).toContain('0141')
        expect(result.targets).toContain('0142')
        expect(result.targets).toHaveLength(3)
      }
    })
  })

  describe('executeCaptureFromMatch', () => {
    describe('NO_MATCH', () => {
      it('應返回空陣列', () => {
        const result: MatchResult = { type: 'NO_MATCH' }
        const captured = executeCaptureFromMatch('0111', null, result)

        expect(captured).toHaveLength(0)
      })
    })

    describe('SINGLE_MATCH', () => {
      it('應捕獲打出的牌和配對的牌', () => {
        const result: MatchResult = { type: 'SINGLE_MATCH', target: '0131' }
        const captured = executeCaptureFromMatch('0111', null, result)

        expect(captured).toContain('0111')
        expect(captured).toContain('0131')
        expect(captured).toHaveLength(2)
      })
    })

    describe('DOUBLE_MATCH', () => {
      it('有選擇目標時應捕獲打出的牌和選擇的牌', () => {
        const result: MatchResult = {
          type: 'DOUBLE_MATCH',
          targets: ['0131', '0141'],
        }
        const captured = executeCaptureFromMatch('0111', '0131', result)

        expect(captured).toContain('0111')
        expect(captured).toContain('0131')
        expect(captured).not.toContain('0141')
        expect(captured).toHaveLength(2)
      })

      it('無選擇目標時應拋出錯誤', () => {
        const result: MatchResult = {
          type: 'DOUBLE_MATCH',
          targets: ['0131', '0141'],
        }

        expect(() => executeCaptureFromMatch('0111', null, result)).toThrow(
          'Double match requires target selection'
        )
      })

      it('選擇無效目標時應拋出錯誤', () => {
        const result: MatchResult = {
          type: 'DOUBLE_MATCH',
          targets: ['0131', '0141'],
        }

        expect(() => executeCaptureFromMatch('0111', '0142', result)).toThrow(
          'Invalid target'
        )
      })
    })

    describe('TRIPLE_MATCH', () => {
      it('應捕獲全部 4 張牌', () => {
        const result: MatchResult = {
          type: 'TRIPLE_MATCH',
          targets: ['0131', '0141', '0142'],
        }
        const captured = executeCaptureFromMatch('0111', null, result)

        expect(captured).toContain('0111')
        expect(captured).toContain('0131')
        expect(captured).toContain('0141')
        expect(captured).toContain('0142')
        expect(captured).toHaveLength(4)
      })
    })
  })

  describe('removeFromField', () => {
    it('應移除被捕獲的卡片', () => {
      const field = ['0111', '0131', '0141', '0241']
      const captured = ['0131', '0141']

      const result = removeFromField(field, captured)

      expect(result).toContain('0111')
      expect(result).toContain('0241')
      expect(result).not.toContain('0131')
      expect(result).not.toContain('0141')
      expect(result).toHaveLength(2)
    })

    it('移除不存在的卡片時不應報錯', () => {
      const field = ['0111', '0131']
      const captured = ['0999'] // 不存在的卡片

      const result = removeFromField(field, captured)

      expect(result).toHaveLength(2)
    })

    it('空場牌時應返回空陣列', () => {
      const result = removeFromField([], ['0111'])

      expect(result).toHaveLength(0)
    })
  })

  describe('addToField', () => {
    it('應將卡片加入場牌', () => {
      const field = ['0111', '0131']
      const result = addToField(field, '0241')

      expect(result).toContain('0111')
      expect(result).toContain('0131')
      expect(result).toContain('0241')
      expect(result).toHaveLength(3)
    })

    it('空場時應正確加入', () => {
      const result = addToField([], '0111')

      expect(result).toContain('0111')
      expect(result).toHaveLength(1)
    })

    it('加入的卡片應在最後', () => {
      const field = ['0111', '0131']
      const result = addToField(field, '0241')

      expect(result[2]).toBe('0241')
    })
  })
})
