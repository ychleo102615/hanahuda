/**
 * HandleRoundDealtUseCase Test
 *
 * @description
 * 測試 HandleRoundDealtUseCase 的事件處理邏輯：
 * - 觸發發牌動畫
 * - 更新場牌、手牌、牌堆狀態
 * - 更新 FlowStage
 *
 * 參考: specs/003-ui-application-layer/contracts/events.md#RoundDealtEvent
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { HandleRoundDealtUseCase } from '@/user-interface/application/use-cases/event-handlers/HandleRoundDealtUseCase'
import type { RoundDealtEvent } from '@/user-interface/application/types'
import {
  createMockUpdateUIStatePort,
  createMockTriggerUIEffectPort,
} from '../../test-helpers/mock-factories'
import type { UpdateUIStatePort, TriggerUIEffectPort } from '@/user-interface/application/ports'

describe('HandleRoundDealtUseCase', () => {
  let mockUpdateUIState: UpdateUIStatePort
  let mockTriggerUIEffect: TriggerUIEffectPort
  let useCase: HandleRoundDealtUseCase

  beforeEach(() => {
    mockUpdateUIState = createMockUpdateUIStatePort()
    mockTriggerUIEffect = createMockTriggerUIEffectPort()
    useCase = new HandleRoundDealtUseCase(mockUpdateUIState, mockTriggerUIEffect)
  })

  describe('觸發發牌動畫', () => {
    it('應該觸發 DEAL_CARDS 動畫並傳遞場牌和手牌資訊', () => {
      // Arrange
      const event: RoundDealtEvent = {
        event_type: 'RoundDealt',
        event_id: 'evt-101',
        timestamp: '2025-01-15T10:01:00Z',
        dealer_id: 'player-1',
        field: ['0101', '0102', '0103', '0104', '0201', '0202', '0203', '0204'],
        hands: [
          { player_id: 'player-1', cards: ['0301', '0302', '0303', '0304', '0401', '0402', '0403', '0404'] },
          { player_id: 'player-2', cards: ['0501', '0502', '0503', '0504', '0601', '0602', '0603', '0604'] },
        ],
        deck_remaining: 24,
        next_state: {
          state_type: 'AWAITING_HAND_PLAY',
          active_player_id: 'player-1',
        },
      }

      // Act
      useCase.execute(event)

      // Assert
      expect(mockTriggerUIEffect.triggerAnimation).toHaveBeenCalledWith('DEAL_CARDS', {
        fieldCards: ['0101', '0102', '0103', '0104', '0201', '0202', '0203', '0204'],
        hands: [
          { player_id: 'player-1', cards: ['0301', '0302', '0303', '0304', '0401', '0402', '0403', '0404'] },
          { player_id: 'player-2', cards: ['0501', '0502', '0503', '0504', '0601', '0602', '0603', '0604'] },
        ],
      })
    })
  })

  describe('更新場牌狀態', () => {
    it('應該更新場牌列表', () => {
      // Arrange
      const event: RoundDealtEvent = {
        event_type: 'RoundDealt',
        event_id: 'evt-102',
        timestamp: '2025-01-15T10:01:00Z',
        dealer_id: 'player-2',
        field: ['0101', '0102', '0103', '0104', '0201', '0202', '0203', '0204'],
        hands: [
          { player_id: 'player-1', cards: ['0301', '0302', '0303', '0304', '0401', '0402', '0403', '0404'] },
          { player_id: 'player-2', cards: ['0501', '0502', '0503', '0504', '0601', '0602', '0603', '0604'] },
        ],
        deck_remaining: 24,
        next_state: {
          state_type: 'AWAITING_HAND_PLAY',
          active_player_id: 'player-2',
        },
      }

      // Act
      useCase.execute(event)

      // Assert
      expect(mockUpdateUIState.updateFieldCards).toHaveBeenCalledWith([
        '0101',
        '0102',
        '0103',
        '0104',
        '0201',
        '0202',
        '0203',
        '0204',
      ])
    })
  })

  describe('更新手牌狀態', () => {
    it('應該更新玩家手牌（假設 player-1 是當前玩家）', () => {
      // Arrange
      const event: RoundDealtEvent = {
        event_type: 'RoundDealt',
        event_id: 'evt-103',
        timestamp: '2025-01-15T10:01:00Z',
        dealer_id: 'player-1',
        field: ['0101', '0102', '0103', '0104', '0201', '0202', '0203', '0204'],
        hands: [
          { player_id: 'player-1', cards: ['0301', '0302', '0303', '0304', '0401', '0402', '0403', '0404'] },
          { player_id: 'player-2', cards: ['0501', '0502', '0503', '0504', '0601', '0602', '0603', '0604'] },
        ],
        deck_remaining: 24,
        next_state: {
          state_type: 'AWAITING_HAND_PLAY',
          active_player_id: 'player-1',
        },
      }

      // Act
      useCase.execute(event)

      // Assert
      expect(mockUpdateUIState.updateHandCards).toHaveBeenCalledWith([
        '0301',
        '0302',
        '0303',
        '0304',
        '0401',
        '0402',
        '0403',
        '0404',
      ])
    })

    it('應該處理玩家手牌不存在的情況（不應拋出錯誤）', () => {
      // Arrange
      const event: RoundDealtEvent = {
        event_type: 'RoundDealt',
        event_id: 'evt-104',
        timestamp: '2025-01-15T10:01:00Z',
        dealer_id: 'player-1',
        field: ['0101', '0102', '0103', '0104', '0201', '0202', '0203', '0204'],
        hands: [
          { player_id: 'player-2', cards: ['0501', '0502', '0503', '0504', '0601', '0602', '0603', '0604'] },
        ],
        deck_remaining: 24,
        next_state: {
          state_type: 'AWAITING_HAND_PLAY',
          active_player_id: 'player-2',
        },
      }

      // Act & Assert: 不應拋出錯誤
      expect(() => useCase.execute(event)).not.toThrow()
    })
  })

  describe('更新牌堆剩餘數量', () => {
    it('應該更新牌堆剩餘數量', () => {
      // Arrange
      const event: RoundDealtEvent = {
        event_type: 'RoundDealt',
        event_id: 'evt-105',
        timestamp: '2025-01-15T10:01:00Z',
        dealer_id: 'player-1',
        field: ['0101', '0102', '0103', '0104', '0201', '0202', '0203', '0204'],
        hands: [
          { player_id: 'player-1', cards: ['0301', '0302', '0303', '0304', '0401', '0402', '0403', '0404'] },
          { player_id: 'player-2', cards: ['0501', '0502', '0503', '0504', '0601', '0602', '0603', '0604'] },
        ],
        deck_remaining: 24,
        next_state: {
          state_type: 'AWAITING_HAND_PLAY',
          active_player_id: 'player-1',
        },
      }

      // Act
      useCase.execute(event)

      // Assert
      expect(mockUpdateUIState.updateDeckRemaining).toHaveBeenCalledWith(24)
    })
  })

  describe('更新 FlowStage', () => {
    it('應該更新 FlowStage 為 AWAITING_HAND_PLAY', () => {
      // Arrange
      const event: RoundDealtEvent = {
        event_type: 'RoundDealt',
        event_id: 'evt-106',
        timestamp: '2025-01-15T10:01:00Z',
        dealer_id: 'player-1',
        field: ['0101', '0102', '0103', '0104', '0201', '0202', '0203', '0204'],
        hands: [
          { player_id: 'player-1', cards: ['0301', '0302', '0303', '0304', '0401', '0402', '0403', '0404'] },
          { player_id: 'player-2', cards: ['0501', '0502', '0503', '0504', '0601', '0602', '0603', '0604'] },
        ],
        deck_remaining: 24,
        next_state: {
          state_type: 'AWAITING_HAND_PLAY',
          active_player_id: 'player-1',
        },
      }

      // Act
      useCase.execute(event)

      // Assert
      expect(mockUpdateUIState.setFlowStage).toHaveBeenCalledWith('AWAITING_HAND_PLAY')
    })
  })

  describe('完整流程', () => {
    it('應該按照正確順序執行所有步驟', () => {
      // Arrange
      const event: RoundDealtEvent = {
        event_type: 'RoundDealt',
        event_id: 'evt-107',
        timestamp: '2025-01-15T10:01:00Z',
        dealer_id: 'player-1',
        field: ['0101', '0102', '0103', '0104', '0201', '0202', '0203', '0204'],
        hands: [
          { player_id: 'player-1', cards: ['0301', '0302', '0303', '0304', '0401', '0402', '0403', '0404'] },
          { player_id: 'player-2', cards: ['0501', '0502', '0503', '0504', '0601', '0602', '0603', '0604'] },
        ],
        deck_remaining: 24,
        next_state: {
          state_type: 'AWAITING_HAND_PLAY',
          active_player_id: 'player-1',
        },
      }

      // Act
      useCase.execute(event)

      // Assert: 驗證所有方法都被調用
      expect(mockTriggerUIEffect.triggerAnimation).toHaveBeenCalled()
      expect(mockUpdateUIState.updateFieldCards).toHaveBeenCalled()
      expect(mockUpdateUIState.updateHandCards).toHaveBeenCalled()
      expect(mockUpdateUIState.updateDeckRemaining).toHaveBeenCalled()
      expect(mockUpdateUIState.setFlowStage).toHaveBeenCalled()
    })
  })
})
