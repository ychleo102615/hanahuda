/**
 * 客戶端驗證測試
 *
 * 測試目標:
 * - validateCardExists() 驗證卡片是否在手牌中
 * - validateTargetInList() 驗證目標是否在可配對列表中
 * - 邊界情況處理
 */

import { describe, it, expect } from 'vitest'
import { validateCardExists, validateTargetInList } from '@/game-client/domain/validation'
import {
  MATSU_HIKARI,
  MATSU_AKATAN,
  MATSU_KASU_1,
  UME_UGUISU,
  UME_AKATAN,
  SAKURA_HIKARI,
  SAKURA_AKATAN,
} from '@/game-client/domain/card-database'
import type { Card } from '@/game-client/domain/types'

describe('validation.ts', () => {
  describe('validateCardExists()', () => {
    describe('卡片存在於手牌中', () => {
      it('應返回 {valid: true} 當卡片在手牌中', () => {
        const card = MATSU_HIKARI
        const handCards = [MATSU_HIKARI, UME_AKATAN, SAKURA_HIKARI]

        const result = validateCardExists(card, handCards)
        expect(result.valid).toBe(true)
        expect(result.reason).toBeUndefined()
      })

      it('應返回 {valid: true} 當卡片是手牌中的唯一卡片', () => {
        const card = MATSU_HIKARI
        const handCards = [MATSU_HIKARI]

        const result = validateCardExists(card, handCards)
        expect(result.valid).toBe(true)
      })

      it('應返回 {valid: true} 當手牌中有多張相同卡片（基於 card_id）', () => {
        const card = MATSU_HIKARI
        const duplicateCard = { ...MATSU_HIKARI } // 相同 card_id 的副本
        const handCards = [duplicateCard, UME_AKATAN]

        const result = validateCardExists(card, handCards)
        expect(result.valid).toBe(true)
      })

      it('應正確驗證不同類型的卡片', () => {
        const brightCard = MATSU_HIKARI
        const ribbonCard = UME_AKATAN
        const animalCard = UME_UGUISU
        const plainCard = MATSU_KASU_1

        const handCards = [brightCard, ribbonCard, animalCard, plainCard]

        expect(validateCardExists(brightCard, handCards).valid).toBe(true)
        expect(validateCardExists(ribbonCard, handCards).valid).toBe(true)
        expect(validateCardExists(animalCard, handCards).valid).toBe(true)
        expect(validateCardExists(plainCard, handCards).valid).toBe(true)
      })
    })

    describe('卡片不存在於手牌中', () => {
      it('應返回 {valid: false, reason: "..."} 當卡片不在手牌中', () => {
        const card = MATSU_HIKARI
        const handCards = [UME_AKATAN, SAKURA_HIKARI]

        const result = validateCardExists(card, handCards)
        expect(result.valid).toBe(false)
        expect(result.reason).toBeDefined()
        expect(result.reason).toBeTruthy()
      })

      it('應提供清晰的錯誤訊息', () => {
        const card = MATSU_HIKARI
        const handCards = [UME_AKATAN]

        const result = validateCardExists(card, handCards)
        expect(result.valid).toBe(false)
        expect(result.reason).toContain('不在手牌中')
      })

      it('應對完全不同的卡片集合返回 false', () => {
        const card = MATSU_HIKARI // 1月
        const handCards = [UME_UGUISU, UME_AKATAN, SAKURA_HIKARI] // 2月, 3月

        const result = validateCardExists(card, handCards)
        expect(result.valid).toBe(false)
      })
    })

    describe('邊界情況', () => {
      it('應對空手牌陣列返回 {valid: false}', () => {
        const card = MATSU_HIKARI
        const handCards: readonly Card[] = []

        const result = validateCardExists(card, handCards)
        expect(result.valid).toBe(false)
        expect(result.reason).toBeDefined()
      })

      it('應對大量手牌正確驗證', () => {
        const card = MATSU_HIKARI
        const handCards = [
          UME_UGUISU,
          UME_AKATAN,
          SAKURA_HIKARI,
          SAKURA_AKATAN,
          MATSU_AKATAN,
          MATSU_KASU_1,
          MATSU_HIKARI, // 目標卡片在列表末尾
        ]

        const result = validateCardExists(card, handCards)
        expect(result.valid).toBe(true)
      })
    })
  })

  describe('validateTargetInList()', () => {
    describe('目標存在於列表中', () => {
      it('應返回 {valid: true} 當目標在可配對列表中', () => {
        const target = MATSU_KASU_1
        const matchableCards = [MATSU_KASU_1, MATSU_AKATAN]

        const result = validateTargetInList(target, matchableCards)
        expect(result.valid).toBe(true)
        expect(result.reason).toBeUndefined()
      })

      it('應返回 {valid: true} 當目標是列表中的唯一卡片', () => {
        const target = MATSU_KASU_1
        const matchableCards = [MATSU_KASU_1]

        const result = validateTargetInList(target, matchableCards)
        expect(result.valid).toBe(true)
      })

      it('應返回 {valid: true} 當列表中有多張卡片', () => {
        const target = MATSU_AKATAN
        const matchableCards = [MATSU_HIKARI, MATSU_KASU_1, MATSU_AKATAN]

        const result = validateTargetInList(target, matchableCards)
        expect(result.valid).toBe(true)
      })

      it('應基於 card_id 比較（不受其他屬性影響）', () => {
        const target = MATSU_HIKARI
        const duplicateCard = { ...MATSU_HIKARI } // 相同 card_id
        const matchableCards = [duplicateCard, MATSU_AKATAN]

        const result = validateTargetInList(target, matchableCards)
        expect(result.valid).toBe(true)
      })
    })

    describe('目標不存在於列表中', () => {
      it('應返回 {valid: false, reason: "..."} 當目標不在列表中', () => {
        const target = MATSU_HIKARI
        const matchableCards = [MATSU_KASU_1, MATSU_AKATAN]

        const result = validateTargetInList(target, matchableCards)
        expect(result.valid).toBe(false)
        expect(result.reason).toBeDefined()
        expect(result.reason).toBeTruthy()
      })

      it('應提供清晰的錯誤訊息', () => {
        const target = MATSU_HIKARI
        const matchableCards = [UME_AKATAN]

        const result = validateTargetInList(target, matchableCards)
        expect(result.valid).toBe(false)
        expect(result.reason).toContain('不在')
      })

      it('應對完全不同的卡片集合返回 false', () => {
        const target = MATSU_HIKARI // 1月光牌
        const matchableCards = [UME_UGUISU, SAKURA_HIKARI] // 2月, 3月

        const result = validateTargetInList(target, matchableCards)
        expect(result.valid).toBe(false)
      })
    })

    describe('邊界情況', () => {
      it('應對空列表返回 {valid: false}', () => {
        const target = MATSU_HIKARI
        const matchableCards: readonly Card[] = []

        const result = validateTargetInList(target, matchableCards)
        expect(result.valid).toBe(false)
        expect(result.reason).toBeDefined()
      })

      it('應對大量可配對卡片正確驗證', () => {
        const target = MATSU_HIKARI
        const matchableCards = [
          MATSU_KASU_1,
          MATSU_AKATAN,
          UME_UGUISU,
          UME_AKATAN,
          SAKURA_HIKARI,
          SAKURA_AKATAN,
          MATSU_HIKARI, // 目標卡片在列表末尾
        ]

        const result = validateTargetInList(target, matchableCards)
        expect(result.valid).toBe(true)
      })
    })
  })

  describe('真實使用場景', () => {
    describe('場景1：玩家嘗試打出手牌', () => {
      it('應驗證卡片在手牌中', () => {
        const playerHandCards = [MATSU_HIKARI, UME_AKATAN, SAKURA_HIKARI]
        const cardToPlay = MATSU_HIKARI

        const result = validateCardExists(cardToPlay, playerHandCards)
        expect(result.valid).toBe(true)
      })

      it('應拒絕不在手牌中的卡片', () => {
        const playerHandCards = [UME_AKATAN, SAKURA_HIKARI]
        const cardToPlay = MATSU_HIKARI

        const result = validateCardExists(cardToPlay, playerHandCards)
        expect(result.valid).toBe(false)
      })
    })

    describe('場景2：玩家選擇配對目標', () => {
      it('應驗證目標在可配對列表中', () => {
        const possibleTargets = [MATSU_KASU_1, MATSU_AKATAN]
        const selectedTarget = MATSU_KASU_1

        const result = validateTargetInList(selectedTarget, possibleTargets)
        expect(result.valid).toBe(true)
      })

      it('應拒絕不在可配對列表中的目標', () => {
        const possibleTargets = [MATSU_KASU_1, MATSU_AKATAN]
        const selectedTarget = UME_AKATAN // 不可配對（不同月份）

        const result = validateTargetInList(selectedTarget, possibleTargets)
        expect(result.valid).toBe(false)
      })
    })

    describe('場景3：多重驗證流程', () => {
      it('應先驗證卡片存在，再驗證目標合法', () => {
        const playerHandCards = [MATSU_HIKARI, UME_AKATAN]
        const cardToPlay = MATSU_HIKARI
        const possibleTargets = [MATSU_KASU_1, MATSU_AKATAN]
        const selectedTarget = MATSU_KASU_1

        // 第一步：驗證卡片在手牌中
        const cardExistsResult = validateCardExists(cardToPlay, playerHandCards)
        expect(cardExistsResult.valid).toBe(true)

        // 第二步：驗證目標在可配對列表中
        const targetValidResult = validateTargetInList(selectedTarget, possibleTargets)
        expect(targetValidResult.valid).toBe(true)
      })

      it('應在卡片不存在時提前返回', () => {
        const playerHandCards = [UME_AKATAN]
        const cardToPlay = MATSU_HIKARI // 不在手牌中

        const cardExistsResult = validateCardExists(cardToPlay, playerHandCards)
        expect(cardExistsResult.valid).toBe(false)
        // 實際應用中，此時應停止後續驗證
      })

      it('應在目標不合法時提示用戶', () => {
        const playerHandCards = [MATSU_HIKARI]
        const cardToPlay = MATSU_HIKARI
        const possibleTargets = [MATSU_KASU_1]
        const selectedTarget = UME_AKATAN // 不可配對

        const cardExistsResult = validateCardExists(cardToPlay, playerHandCards)
        expect(cardExistsResult.valid).toBe(true)

        const targetValidResult = validateTargetInList(selectedTarget, possibleTargets)
        expect(targetValidResult.valid).toBe(false)
      })
    })
  })
})
