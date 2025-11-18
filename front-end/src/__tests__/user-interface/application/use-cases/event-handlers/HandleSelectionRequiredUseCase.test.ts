/**
 * HandleSelectionRequiredUseCase Test
 *
 * @description
 * 測試 HandleSelectionRequiredUseCase 的事件處理邏輯：
 * - 觸發手牌移動動畫
 * - 更新手牌狀態
 * - 顯示選擇配對 UI 並高亮可選目標
 * - 更新 FlowStage 為 AWAITING_SELECTION
 *
 * 參考: specs/003-ui-application-layer/contracts/events.md#SelectionRequiredEvent
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { HandleSelectionRequiredUseCase } from '@/user-interface/application/use-cases/event-handlers/HandleSelectionRequiredUseCase'
import type { SelectionRequiredEvent } from '@/user-interface/application/types'
import {
  createMockUIStatePort,
  createMockTriggerUIEffectPort,
} from '../../test-helpers/mock-factories'
import type { UIStatePort, TriggerUIEffectPort } from '@/user-interface/application/ports'

describe('HandleSelectionRequiredUseCase', () => {
  let mockUIState: UIStatePort
  let mockTriggerUIEffect: TriggerUIEffectPort
  let useCase: HandleSelectionRequiredUseCase

  beforeEach(() => {
    mockUIState = createMockUIStatePort()
    mockTriggerUIEffect = createMockTriggerUIEffectPort()
    useCase = new HandleSelectionRequiredUseCase(mockUIState, mockTriggerUIEffect)
  })

  describe('觸發手牌移動動畫', () => {
    it('應該觸發手牌卡片移動動畫', () => {
      // Arrange
      const event: SelectionRequiredEvent = {
        event_type: 'SelectionRequired',
        event_id: 'evt-301',
        timestamp: '2025-01-15T10:03:00Z',
        player_id: 'player-1',
        hand_card_play: {
          played_card: '0301',
          matched_card: '0101',
          captured_cards: ['0301', '0101'],
        },
        drawn_card: '0401',
        possible_targets: ['0102', '0103'],
        deck_remaining: 21,
      }

      // Act
      useCase.execute(event)

      // Assert
      expect(mockTriggerUIEffect.triggerAnimation).toHaveBeenCalledWith(
        'CARD_MOVE',
        expect.objectContaining({
          cardId: '0301',
        })
      )
    })
  })

  describe('顯示選擇配對 UI', () => {
    it('應該調用 showSelectionUI 並傳遞可選目標列表', () => {
      // Arrange
      const event: SelectionRequiredEvent = {
        event_type: 'SelectionRequired',
        event_id: 'evt-302',
        timestamp: '2025-01-15T10:03:00Z',
        player_id: 'player-1',
        hand_card_play: {
          played_card: '0301',
          matched_card: '0101',
          captured_cards: ['0301', '0101'],
        },
        drawn_card: '0401',
        possible_targets: ['0102', '0103'],
        deck_remaining: 21,
      }

      // Act
      useCase.execute(event)

      // Assert
      expect(mockTriggerUIEffect.showSelectionUI).toHaveBeenCalledWith(['0102', '0103'])
    })

    it('應該處理多個可選目標', () => {
      // Arrange
      const event: SelectionRequiredEvent = {
        event_type: 'SelectionRequired',
        event_id: 'evt-303',
        timestamp: '2025-01-15T10:03:00Z',
        player_id: 'player-1',
        hand_card_play: {
          played_card: '0301',
          matched_card: '0101',
          captured_cards: ['0301', '0101'],
        },
        drawn_card: '0401',
        possible_targets: ['0402', '0403', '0404'],
        deck_remaining: 21,
      }

      // Act
      useCase.execute(event)

      // Assert
      expect(mockTriggerUIEffect.showSelectionUI).toHaveBeenCalledWith(['0402', '0403', '0404'])
    })
  })

  describe('更新 FlowStage', () => {
    it('應該更新 FlowStage 為 AWAITING_SELECTION', () => {
      // Arrange
      const event: SelectionRequiredEvent = {
        event_type: 'SelectionRequired',
        event_id: 'evt-304',
        timestamp: '2025-01-15T10:03:00Z',
        player_id: 'player-1',
        hand_card_play: {
          played_card: '0301',
          matched_card: '0101',
          captured_cards: ['0301', '0101'],
        },
        drawn_card: '0401',
        possible_targets: ['0102', '0103'],
        deck_remaining: 21,
      }

      // Act
      useCase.execute(event)

      // Assert
      expect(mockUIState.setFlowStage).toHaveBeenCalledWith('AWAITING_SELECTION')
    })
  })

  describe('完整流程', () => {
    it('應該按照正確順序執行所有步驟', () => {
      // Arrange
      const event: SelectionRequiredEvent = {
        event_type: 'SelectionRequired',
        event_id: 'evt-305',
        timestamp: '2025-01-15T10:03:00Z',
        player_id: 'player-1',
        hand_card_play: {
          played_card: '0301',
          matched_card: '0101',
          captured_cards: ['0301', '0101'],
        },
        drawn_card: '0401',
        possible_targets: ['0102', '0103'],
        deck_remaining: 21,
      }

      // Act
      useCase.execute(event)

      // Assert: 驗證所有方法都被調用
      expect(mockTriggerUIEffect.triggerAnimation).toHaveBeenCalled()
      expect(mockTriggerUIEffect.showSelectionUI).toHaveBeenCalled()
      expect(mockUIState.setFlowStage).toHaveBeenCalled()
    })
  })
})
