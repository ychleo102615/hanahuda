/**
 * HandleSelectionRequiredUseCase Test
 *
 * @description
 * 測試 HandleSelectionRequiredUseCase 的事件處理邏輯：
 * - 觸發手牌移動動畫
 * - 更新手牌狀態
 * - 保存翻出卡片和可選目標列表
 * - 更新 FlowStage 為 AWAITING_SELECTION
 * - Adapter Layer 監聽 FlowStage 變化觸發場牌選擇 UI
 *
 * 參考: specs/003-ui-application-layer/contracts/events.md#SelectionRequiredEvent
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { HandleSelectionRequiredUseCase } from '@/user-interface/application/use-cases/event-handlers/HandleSelectionRequiredUseCase'
import type { SelectionRequiredEvent } from '@/user-interface/application/types'
import {
  createMockNotificationPort,
  createMockGameStatePort,
  createMockAnimationPort,
  createMockDomainFacade,
} from '../../test-helpers/mock-factories'
import type { NotificationPort, GameStatePort, AnimationPort } from '@/user-interface/application/ports'
import type { DomainFacade } from '@/user-interface/application/types'

describe('HandleSelectionRequiredUseCase', () => {
  let mockNotification: NotificationPort
  let mockGameState: GameStatePort
  let mockAnimation: AnimationPort
  let mockDomainFacade: DomainFacade
  let useCase: HandleSelectionRequiredUseCase

  beforeEach(() => {
    mockNotification = createMockNotificationPort()
    mockGameState = createMockGameStatePort()
    mockAnimation = createMockAnimationPort()
    mockDomainFacade = createMockDomainFacade()
    useCase = new HandleSelectionRequiredUseCase(mockGameState, mockAnimation, mockDomainFacade, mockNotification)
  })

  describe('觸發手牌移動動畫', () => {
    it('應該觸發手牌卡片移動動畫', async () => {
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
        action_timeout_seconds: 30,
      }

      // Act
      await useCase.execute(event)

      // Assert: 應該播放手牌飛向場牌的動畫
      expect(mockAnimation.playCardToFieldAnimation).toHaveBeenCalledWith('0301', false, '0101')
    })
  })

  describe('保存可配對目標', () => {
    it('應該保存翻出的卡片和可選目標列表', async () => {
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
        action_timeout_seconds: 30,
      }

      // Act
      await useCase.execute(event)

      // Assert
      expect(mockGameState.setDrawnCard).toHaveBeenCalledWith('0401')
      expect(mockGameState.setPossibleTargetCardIds).toHaveBeenCalledWith(['0102', '0103'])
    })
  })

  describe('更新 FlowStage', () => {
    it('應該更新 FlowStage 為 AWAITING_SELECTION', async () => {
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
        action_timeout_seconds: 30,
      }

      // Act
      await useCase.execute(event)

      // Assert
      expect(mockGameState.setFlowStage).toHaveBeenCalledWith('AWAITING_SELECTION')
    })
  })

  describe('完整流程', () => {
    it('應該按照正確順序執行所有步驟', async () => {
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
        action_timeout_seconds: 30,
      }

      // Act
      await useCase.execute(event)

      // Assert: 驗證所有方法都被調用
      expect(mockAnimation.playCardToFieldAnimation).toHaveBeenCalled()
      expect(mockGameState.setDrawnCard).toHaveBeenCalled()
      expect(mockGameState.setPossibleTargetCardIds).toHaveBeenCalled()
      expect(mockGameState.setFlowStage).toHaveBeenCalled()
    })
  })
})
