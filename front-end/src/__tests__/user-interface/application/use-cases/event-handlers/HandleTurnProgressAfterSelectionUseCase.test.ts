/**
 * HandleTurnProgressAfterSelectionUseCase Test
 *
 * @description
 * 測試 HandleTurnProgressAfterSelectionUseCase 的事件處理邏輯：
 * - 觸發選擇後的卡片移動動畫
 * - 更新場牌、獲得區狀態
 * - 若有新役種形成，觸發役種特效
 * - 更新 FlowStage
 *
 * 參考: specs/003-ui-application-layer/contracts/events.md#TurnProgressAfterSelectionEvent
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { HandleTurnProgressAfterSelectionUseCase } from '@/user-interface/application/use-cases/event-handlers/HandleTurnProgressAfterSelectionUseCase'
import type { TurnProgressAfterSelectionEvent } from '@/user-interface/application/types'
import {
  createMockUpdateUIStatePort,
  createMockTriggerUIEffectPort,
  createMockDomainFacade,
} from '../../test-helpers/mock-factories'
import type { UpdateUIStatePort, TriggerUIEffectPort, DomainFacade } from '@/user-interface/application'

describe('HandleTurnProgressAfterSelectionUseCase', () => {
  let mockUpdateUIState: UpdateUIStatePort
  let mockTriggerUIEffect: TriggerUIEffectPort
  let mockDomainFacade: DomainFacade
  let useCase: HandleTurnProgressAfterSelectionUseCase

  beforeEach(() => {
    mockUpdateUIState = createMockUpdateUIStatePort()
    mockTriggerUIEffect = createMockTriggerUIEffectPort()
    mockDomainFacade = createMockDomainFacade()
    useCase = new HandleTurnProgressAfterSelectionUseCase(
      mockUpdateUIState,
      mockTriggerUIEffect,
      mockDomainFacade
    )
  })

  describe('觸發卡片移動動畫', () => {
    it('應該觸發翻牌卡片移動動畫', () => {
      // Arrange
      const event: TurnProgressAfterSelectionEvent = {
        event_type: 'TurnProgressAfterSelection',
        event_id: 'evt-401',
        timestamp: '2025-01-15T10:04:00Z',
        player_id: 'player-1',
        selection: {
          source_card: '0401',
          selected_target: '0102',
          captured_cards: ['0401', '0102'],
        },
        draw_card_play: {
          played_card: '0501',
          matched_card: '0201',
          captured_cards: ['0501', '0201'],
        },
        yaku_update: null,
        deck_remaining: 20,
        next_state: {
          state_type: 'AWAITING_HAND_PLAY',
          active_player_id: 'player-2',
        },
      }

      // Act
      useCase.execute(event)

      // Assert
      expect(mockTriggerUIEffect.triggerAnimation).toHaveBeenCalledWith(
        'CARD_MOVE',
        expect.objectContaining({
          cardId: '0501',
        })
      )
    })
  })

  describe('觸發役種特效', () => {
    it('應該在有新役種形成時觸發 YAKU_EFFECT 動畫', () => {
      // Arrange
      const event: TurnProgressAfterSelectionEvent = {
        event_type: 'TurnProgressAfterSelection',
        event_id: 'evt-402',
        timestamp: '2025-01-15T10:04:00Z',
        player_id: 'player-1',
        selection: {
          source_card: '0401',
          selected_target: '0102',
          captured_cards: ['0401', '0102'],
        },
        draw_card_play: {
          played_card: '0501',
          matched_card: null,
          captured_cards: [],
        },
        yaku_update: {
          newly_formed_yaku: [
            {
              yaku_type: 'TANE',
              base_points: 1,
              contributing_cards: ['0401', '0501', '0601', '0701', '0801'],
            },
          ],
          all_active_yaku: [
            {
              yaku_type: 'TANE',
              base_points: 1,
              contributing_cards: ['0401', '0501', '0601', '0701', '0801'],
            },
          ],
        },
        deck_remaining: 20,
        next_state: {
          state_type: 'AWAITING_HAND_PLAY',
          active_player_id: 'player-2',
        },
      }

      // Act
      useCase.execute(event)

      // Assert
      expect(mockTriggerUIEffect.triggerAnimation).toHaveBeenCalledWith(
        'YAKU_EFFECT',
        expect.objectContaining({
          yakuType: 'TANE',
          affectedCards: ['0401', '0501', '0601', '0701', '0801'],
        })
      )
    })

    it('應該在沒有新役種時跳過役種特效', () => {
      // Arrange
      const event: TurnProgressAfterSelectionEvent = {
        event_type: 'TurnProgressAfterSelection',
        event_id: 'evt-403',
        timestamp: '2025-01-15T10:04:00Z',
        player_id: 'player-1',
        selection: {
          source_card: '0401',
          selected_target: '0102',
          captured_cards: ['0401', '0102'],
        },
        draw_card_play: {
          played_card: '0501',
          matched_card: null,
          captured_cards: [],
        },
        yaku_update: null,
        deck_remaining: 20,
        next_state: {
          state_type: 'AWAITING_HAND_PLAY',
          active_player_id: 'player-2',
        },
      }

      // Act
      useCase.execute(event)

      // Assert: 不應該觸發 YAKU_EFFECT
      expect(mockTriggerUIEffect.triggerAnimation).not.toHaveBeenCalledWith(
        'YAKU_EFFECT',
        expect.any(Object)
      )
    })
  })

  describe('更新 FlowStage', () => {
    it('應該更新 FlowStage', () => {
      // Arrange
      const event: TurnProgressAfterSelectionEvent = {
        event_type: 'TurnProgressAfterSelection',
        event_id: 'evt-404',
        timestamp: '2025-01-15T10:04:00Z',
        player_id: 'player-1',
        selection: {
          source_card: '0401',
          selected_target: '0102',
          captured_cards: ['0401', '0102'],
        },
        draw_card_play: {
          played_card: '0501',
          matched_card: null,
          captured_cards: [],
        },
        yaku_update: null,
        deck_remaining: 20,
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
})
