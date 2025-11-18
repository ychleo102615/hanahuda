/**
 * HandleTurnCompletedUseCase Test
 *
 * @description
 * 測試 HandleTurnCompletedUseCase 的事件處理邏輯：
 * - 觸發卡片移動動畫（手牌操作、翻牌操作）
 * - 更新場牌、手牌、獲得區狀態
 * - 更新牌堆剩餘數量
 * - 更新 FlowStage
 *
 * 參考: specs/003-ui-application-layer/contracts/events.md#TurnCompletedEvent
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { HandleTurnCompletedUseCase } from '@/user-interface/application/use-cases/event-handlers/HandleTurnCompletedUseCase'
import type { TurnCompletedEvent } from '@/user-interface/application/types'
import {
  createMockUpdateUIStatePort,
  createMockTriggerUIEffectPort,
} from '../../test-helpers/mock-factories'
import type { UpdateUIStatePort, TriggerUIEffectPort } from '@/user-interface/application/ports'

describe('HandleTurnCompletedUseCase', () => {
  let mockUpdateUIState: UpdateUIStatePort
  let mockTriggerUIEffect: TriggerUIEffectPort
  let useCase: HandleTurnCompletedUseCase

  beforeEach(() => {
    mockUpdateUIState = createMockUpdateUIStatePort()
    mockTriggerUIEffect = createMockTriggerUIEffectPort()
    useCase = new HandleTurnCompletedUseCase(mockUpdateUIState, mockTriggerUIEffect)
  })

  describe('觸發卡片移動動畫', () => {
    it('應該觸發手牌移動動畫（hand -> depository）', () => {
      // Arrange
      const event: TurnCompletedEvent = {
        event_type: 'TurnCompleted',
        event_id: 'evt-201',
        timestamp: '2025-01-15T10:02:00Z',
        player_id: 'player-1',
        hand_card_play: {
          played_card: '0301',
          matched_card: '0101',
          captured_cards: ['0301', '0101'],
        },
        draw_card_play: null,
        deck_remaining: 23,
        next_state: {
          state_type: 'AWAITING_HAND_PLAY',
          active_player_id: 'player-2',
        },
      }

      // Act
      useCase.execute(event)

      // Assert: 應該觸發手牌卡片移動動畫
      expect(mockTriggerUIEffect.triggerAnimation).toHaveBeenCalledWith(
        'CARD_MOVE',
        expect.objectContaining({
          cardId: '0301',
          from: 'hand',
          to: 'depository',
        })
      )
    })

    it('應該觸發翻牌移動動畫（deck -> depository）', () => {
      // Arrange
      const event: TurnCompletedEvent = {
        event_type: 'TurnCompleted',
        event_id: 'evt-202',
        timestamp: '2025-01-15T10:02:00Z',
        player_id: 'player-1',
        hand_card_play: {
          played_card: '0301',
          matched_card: '0101',
          captured_cards: ['0301', '0101'],
        },
        draw_card_play: {
          played_card: '0302',
          matched_card: '0102',
          captured_cards: ['0302', '0102'],
        },
        deck_remaining: 22,
        next_state: {
          state_type: 'AWAITING_HAND_PLAY',
          active_player_id: 'player-2',
        },
      }

      // Act
      useCase.execute(event)

      // Assert: 應該觸發翻牌卡片移動動畫
      expect(mockTriggerUIEffect.triggerAnimation).toHaveBeenCalledWith(
        'CARD_MOVE',
        expect.objectContaining({
          cardId: '0302',
          from: 'deck',
          to: 'depository',
        })
      )
    })

    it('應該處理 hand_card_play 為 null 的情況', () => {
      // Arrange
      const event: TurnCompletedEvent = {
        event_type: 'TurnCompleted',
        event_id: 'evt-203',
        timestamp: '2025-01-15T10:02:00Z',
        player_id: 'player-1',
        hand_card_play: null,
        draw_card_play: {
          played_card: '0302',
          matched_card: '0102',
          captured_cards: ['0302', '0102'],
        },
        deck_remaining: 22,
        next_state: {
          state_type: 'AWAITING_HAND_PLAY',
          active_player_id: 'player-2',
        },
      }

      // Act & Assert: 不應拋出錯誤
      expect(() => useCase.execute(event)).not.toThrow()
    })

    it('應該處理 draw_card_play 為 null 的情況', () => {
      // Arrange
      const event: TurnCompletedEvent = {
        event_type: 'TurnCompleted',
        event_id: 'evt-204',
        timestamp: '2025-01-15T10:02:00Z',
        player_id: 'player-1',
        hand_card_play: {
          played_card: '0301',
          matched_card: '0101',
          captured_cards: ['0301', '0101'],
        },
        draw_card_play: null,
        deck_remaining: 23,
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
      const event: TurnCompletedEvent = {
        event_type: 'TurnCompleted',
        event_id: 'evt-205',
        timestamp: '2025-01-15T10:02:00Z',
        player_id: 'player-1',
        hand_card_play: {
          played_card: '0301',
          matched_card: '0101',
          captured_cards: ['0301', '0101'],
        },
        draw_card_play: {
          played_card: '0302',
          matched_card: '0102',
          captured_cards: ['0302', '0102'],
        },
        deck_remaining: 22,
        next_state: {
          state_type: 'AWAITING_HAND_PLAY',
          active_player_id: 'player-2',
        },
      }

      // Act
      useCase.execute(event)

      // Assert
      expect(mockUpdateUIState.updateDeckRemaining).toHaveBeenCalledWith(22)
    })
  })

  describe('更新 FlowStage', () => {
    it('應該更新 FlowStage', () => {
      // Arrange
      const event: TurnCompletedEvent = {
        event_type: 'TurnCompleted',
        event_id: 'evt-206',
        timestamp: '2025-01-15T10:02:00Z',
        player_id: 'player-1',
        hand_card_play: {
          played_card: '0301',
          matched_card: null,
          captured_cards: [],
        },
        draw_card_play: null,
        deck_remaining: 23,
        next_state: {
          state_type: 'AWAITING_HAND_PLAY',
          active_player_id: 'player-2',
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
      const event: TurnCompletedEvent = {
        event_type: 'TurnCompleted',
        event_id: 'evt-207',
        timestamp: '2025-01-15T10:02:00Z',
        player_id: 'player-1',
        hand_card_play: {
          played_card: '0301',
          matched_card: '0101',
          captured_cards: ['0301', '0101'],
        },
        draw_card_play: {
          played_card: '0302',
          matched_card: '0102',
          captured_cards: ['0302', '0102'],
        },
        deck_remaining: 22,
        next_state: {
          state_type: 'AWAITING_HAND_PLAY',
          active_player_id: 'player-2',
        },
      }

      // Act
      useCase.execute(event)

      // Assert: 驗證所有方法都被調用
      expect(mockTriggerUIEffect.triggerAnimation).toHaveBeenCalled()
      expect(mockUpdateUIState.updateDeckRemaining).toHaveBeenCalled()
      expect(mockUpdateUIState.setFlowStage).toHaveBeenCalled()
    })

    it('應該處理無配對的情況（matched_card 為 null）', () => {
      // Arrange
      const event: TurnCompletedEvent = {
        event_type: 'TurnCompleted',
        event_id: 'evt-208',
        timestamp: '2025-01-15T10:02:00Z',
        player_id: 'player-1',
        hand_card_play: {
          played_card: '0301',
          matched_card: null,
          captured_cards: [],
        },
        draw_card_play: {
          played_card: '0302',
          matched_card: null,
          captured_cards: [],
        },
        deck_remaining: 22,
        next_state: {
          state_type: 'AWAITING_HAND_PLAY',
          active_player_id: 'player-2',
        },
      }

      // Act & Assert: 不應拋出錯誤
      expect(() => useCase.execute(event)).not.toThrow()
    })
  })
})
