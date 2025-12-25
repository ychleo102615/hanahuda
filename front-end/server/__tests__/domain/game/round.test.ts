/**
 * Round Entity Tests
 *
 * @description
 * Round 實體的單元測試。
 * 測試回合建立、狀態轉換、卡片收集等操作。
 *
 * @module server/__tests__/domain/game/round.test
 */

import { describe, it, expect } from 'vitest'
import {
  createRound,
  getPlayerHand,
  getPlayerDepository,
  getOpponentId,
  isActivePlayer,
  getPlayerKoiStatus,
  detectTeshi,
  detectKuttsuki,
  detectFieldTeshi,
} from '~/server/domain/round'
import type { DealResult } from '~/server/domain/services/deckService'
import {
  createTestRound,
  createRoundAwaitingSelection,
  createRoundAwaitingDecision,
  PLAYER_1_ID,
  PLAYER_2_ID,
} from '../../fixtures/games'
import { TESHI_CARDS, KUTTSUKI_HAND, FIELD_TESHI_CARDS, HAND_STANDARD, FIELD_MIXED_CARDS } from '../../fixtures/cards'

describe('Round Entity', () => {
  describe('createRound', () => {
    it('應正確建立初始回合', () => {
      const dealResult: DealResult = {
        playerHands: new Map([
          [PLAYER_1_ID, HAND_STANDARD],
          [PLAYER_2_ID, HAND_STANDARD],
        ]),
        field: FIELD_MIXED_CARDS,
        deck: ['0941', '0942', '1021', '1031', '1041', '1042'],
      }

      const round = createRound({
        dealerId: PLAYER_1_ID,
        playerIds: [PLAYER_1_ID, PLAYER_2_ID],
        dealResult,
        startingPlayerId: PLAYER_1_ID,
      })

      expect(round.dealerId).toBe(PLAYER_1_ID)
      expect(round.activePlayerId).toBe(PLAYER_1_ID)
      expect(round.flowState).toBe('AWAITING_HAND_PLAY')
      expect(round.version).toBe(1)
    })

    it('應正確設定玩家手牌', () => {
      const dealResult: DealResult = {
        playerHands: new Map([
          [PLAYER_1_ID, HAND_STANDARD],
          [PLAYER_2_ID, ['0241', '0242', '0341', '0342', '0441', '0442', '0541', '0542']],
        ]),
        field: FIELD_MIXED_CARDS,
        deck: [],
      }

      const round = createRound({
        dealerId: PLAYER_1_ID,
        playerIds: [PLAYER_1_ID, PLAYER_2_ID],
        dealResult,
        startingPlayerId: PLAYER_1_ID,
      })

      expect(round.playerStates[0]?.hand).toEqual(HAND_STANDARD)
      expect(round.playerStates[1]?.hand).toHaveLength(8)
    })

    it('應初始化空的獲得區', () => {
      const dealResult: DealResult = {
        playerHands: new Map([
          [PLAYER_1_ID, HAND_STANDARD],
          [PLAYER_2_ID, HAND_STANDARD],
        ]),
        field: FIELD_MIXED_CARDS,
        deck: [],
      }

      const round = createRound({
        dealerId: PLAYER_1_ID,
        playerIds: [PLAYER_1_ID, PLAYER_2_ID],
        dealResult,
        startingPlayerId: PLAYER_1_ID,
      })

      expect(round.playerStates[0]?.depository).toHaveLength(0)
      expect(round.playerStates[1]?.depository).toHaveLength(0)
    })

    it('應初始化 KoiStatus', () => {
      const dealResult: DealResult = {
        playerHands: new Map([
          [PLAYER_1_ID, HAND_STANDARD],
          [PLAYER_2_ID, HAND_STANDARD],
        ]),
        field: FIELD_MIXED_CARDS,
        deck: [],
      }

      const round = createRound({
        dealerId: PLAYER_1_ID,
        playerIds: [PLAYER_1_ID, PLAYER_2_ID],
        dealResult,
        startingPlayerId: PLAYER_1_ID,
      })

      expect(round.koiStatuses).toHaveLength(2)
      expect(round.koiStatuses[0]?.times_continued).toBe(0)
      expect(round.koiStatuses[1]?.times_continued).toBe(0)
    })

    it('玩家 ID 無手牌時應拋出錯誤', () => {
      const dealResult: DealResult = {
        playerHands: new Map([
          [PLAYER_1_ID, HAND_STANDARD],
          // 缺少 PLAYER_2_ID 的手牌
        ]),
        field: FIELD_MIXED_CARDS,
        deck: [],
      }

      expect(() =>
        createRound({
          dealerId: PLAYER_1_ID,
          playerIds: [PLAYER_1_ID, PLAYER_2_ID],
          dealResult,
          startingPlayerId: PLAYER_1_ID,
        })
      ).toThrow('No hand dealt for player')
    })
  })

  describe('Query Functions', () => {
    describe('getPlayerHand', () => {
      it('應返回玩家手牌', () => {
        const round = createTestRound()

        const hand = getPlayerHand(round, PLAYER_1_ID)

        expect(hand).toEqual(HAND_STANDARD)
      })

      it('不存在的玩家應返回空陣列', () => {
        const round = createTestRound()

        const hand = getPlayerHand(round, 'unknown-player')

        expect(hand).toHaveLength(0)
      })
    })

    describe('getPlayerDepository', () => {
      it('應返回玩家獲得區', () => {
        const round = createTestRound({
          playerStates: [
            { playerId: PLAYER_1_ID, hand: HAND_STANDARD, depository: ['0111', '0131'] },
            { playerId: PLAYER_2_ID, hand: HAND_STANDARD, depository: [] },
          ],
        })

        const depository = getPlayerDepository(round, PLAYER_1_ID)

        expect(depository).toEqual(['0111', '0131'])
      })

      it('不存在的玩家應返回空陣列', () => {
        const round = createTestRound()

        const depository = getPlayerDepository(round, 'unknown-player')

        expect(depository).toHaveLength(0)
      })
    })

    describe('getOpponentId', () => {
      it('應返回對手 ID', () => {
        const round = createTestRound()

        const opponentId = getOpponentId(round, PLAYER_1_ID)

        expect(opponentId).toBe(PLAYER_2_ID)
      })

      it('從玩家 2 角度應返回玩家 1', () => {
        const round = createTestRound()

        const opponentId = getOpponentId(round, PLAYER_2_ID)

        expect(opponentId).toBe(PLAYER_1_ID)
      })
    })

    describe('isActivePlayer', () => {
      it('活躍玩家應返回 true', () => {
        const round = createTestRound({ activePlayerId: PLAYER_1_ID })

        expect(isActivePlayer(round, PLAYER_1_ID)).toBe(true)
      })

      it('非活躍玩家應返回 false', () => {
        const round = createTestRound({ activePlayerId: PLAYER_1_ID })

        expect(isActivePlayer(round, PLAYER_2_ID)).toBe(false)
      })
    })

    describe('getPlayerKoiStatus', () => {
      it('應返回玩家的 KoiStatus', () => {
        const round = createTestRound()

        const status = getPlayerKoiStatus(round, PLAYER_1_ID)

        expect(status?.player_id).toBe(PLAYER_1_ID)
        expect(status?.times_continued).toBe(0)
      })

      it('不存在的玩家應返回 null', () => {
        const round = createTestRound()

        const status = getPlayerKoiStatus(round, 'unknown-player')

        expect(status).toBeNull()
      })
    })
  })

  describe('Flow States', () => {
    describe('AWAITING_HAND_PLAY', () => {
      it('初始狀態應為 AWAITING_HAND_PLAY', () => {
        const round = createTestRound()

        expect(round.flowState).toBe('AWAITING_HAND_PLAY')
        expect(round.pendingSelection).toBeNull()
        expect(round.pendingDecision).toBeNull()
      })
    })

    describe('AWAITING_SELECTION', () => {
      it('應有 pendingSelection', () => {
        const round = createRoundAwaitingSelection()

        expect(round.flowState).toBe('AWAITING_SELECTION')
        expect(round.pendingSelection).not.toBeNull()
        expect(round.pendingSelection?.drawnCard).toBe('0131')
        expect(round.pendingSelection?.possibleTargets).toHaveLength(2)
      })
    })

    describe('AWAITING_DECISION', () => {
      it('應有 pendingDecision', () => {
        const round = createRoundAwaitingDecision()

        expect(round.flowState).toBe('AWAITING_DECISION')
        expect(round.pendingDecision).not.toBeNull()
        expect(round.pendingDecision?.activeYaku).toHaveLength(1)
      })
    })
  })

  describe('Special Rules Detection', () => {
    describe('detectTeshi', () => {
      it('應檢測到手四', () => {
        const result = detectTeshi(TESHI_CARDS)

        expect(result.hasTeshi).toBe(true)
        expect(result.month).toBe(1) // 1 月
      })

      it('無手四時應返回 false', () => {
        const result = detectTeshi(HAND_STANDARD)

        expect(result.hasTeshi).toBe(false)
        expect(result.month).toBeNull()
      })

      it('空手牌應返回 false', () => {
        const result = detectTeshi([])

        expect(result.hasTeshi).toBe(false)
      })
    })

    describe('detectKuttsuki', () => {
      it('應檢測到喰付（手牌 4 對同月份）', () => {
        const result = detectKuttsuki(KUTTSUKI_HAND)

        expect(result.hasKuttsuki).toBe(true)
        expect(result.months).toEqual([1, 2, 3, 4])
      })

      it('無喰付時應返回 false', () => {
        const result = detectKuttsuki(HAND_STANDARD)

        expect(result.hasKuttsuki).toBe(false)
        expect(result.months).toBeNull()
      })

      it('空手牌應返回 false', () => {
        const result = detectKuttsuki([])

        expect(result.hasKuttsuki).toBe(false)
      })

      it('手牌非 8 張時應返回 false', () => {
        const result = detectKuttsuki(TESHI_CARDS) // 4 張

        expect(result.hasKuttsuki).toBe(false)
      })
    })

    describe('detectFieldTeshi', () => {
      it('應檢測到場上手四（場牌 4 張同月份）', () => {
        const result = detectFieldTeshi(FIELD_TESHI_CARDS)

        expect(result.hasFieldTeshi).toBe(true)
        expect(result.month).not.toBeNull()
      })

      it('無場上手四時應返回 false', () => {
        const result = detectFieldTeshi(FIELD_MIXED_CARDS)

        expect(result.hasFieldTeshi).toBe(false)
        expect(result.month).toBeNull()
      })

      it('空場牌應返回 false', () => {
        const result = detectFieldTeshi([])

        expect(result.hasFieldTeshi).toBe(false)
      })
    })
  })

  describe('Version Control', () => {
    it('初始版本應為 1', () => {
      const round = createTestRound()

      expect(round.version).toBe(1)
    })

    it('應可建立指定版本的回合', () => {
      const round = createTestRound({ version: 5 })

      expect(round.version).toBe(5)
    })
  })
})
