/**
 * HandleTurnProgressAfterSelectionUseCase Test
 *
 * @description
 * 測試 HandleTurnProgressAfterSelectionUseCase 的事件處理邏輯：
 * - 播放翻牌配對動畫（翻牌動畫已在 HandleSelectionRequiredUseCase 播放）
 * - 若有新役種形成，記錄役種達成
 * - 更新 FlowStage
 *
 * Phase 7 更新：使用 GameStatePort + AnimationPort 替代舊介面
 *
 * 參考: specs/003-ui-application-layer/contracts/events.md#TurnProgressAfterSelectionEvent
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { HandleTurnProgressAfterSelectionUseCase } from '@/user-interface/application/use-cases/event-handlers/HandleTurnProgressAfterSelectionUseCase'
import type { TurnProgressAfterSelectionEvent } from '@/user-interface/application/types'
import {
  createMockGameStatePort,
  createMockAnimationPort,
  createMockDomainFacade,
} from '../../test-helpers/mock-factories'
import type { GameStatePort, AnimationPort } from '@/user-interface/application/ports'
import type { DomainFacade } from '@/user-interface/application/types'

describe('HandleTurnProgressAfterSelectionUseCase', () => {
  let mockGameState: GameStatePort
  let mockAnimation: AnimationPort
  let mockDomainFacade: DomainFacade
  let useCase: HandleTurnProgressAfterSelectionUseCase

  beforeEach(() => {
    mockGameState = createMockGameStatePort()
    mockAnimation = createMockAnimationPort()
    mockDomainFacade = createMockDomainFacade()
    useCase = new HandleTurnProgressAfterSelectionUseCase(
      mockGameState,
      mockAnimation,
      mockDomainFacade
    )
  })

  // Helper: 等待異步操作完成
  const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0))

  describe('播放配對動畫', () => {
    it('應該在翻牌有配對時播放 playMatchAnimation + playToDepositoryAnimation', async () => {
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
      await flushPromises()

      // Assert: 應該播放配對動畫（翻牌動畫已在 HandleSelectionRequiredUseCase 播放）
      expect(mockAnimation.playMatchAnimation).toHaveBeenCalledWith('0501', '0201')
      expect(mockAnimation.playToDepositoryAnimation).toHaveBeenCalledWith(
        ['0501', '0201'],
        'PLAIN',
        false
      )
    })

    it('應該在翻牌無配對時不播放動畫', async () => {
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
        yaku_update: null,
        deck_remaining: 20,
        next_state: {
          state_type: 'AWAITING_HAND_PLAY',
          active_player_id: 'player-2',
        },
      }

      // Act
      useCase.execute(event)
      await flushPromises()

      // Assert: 翻牌無配對時不播放動畫
      expect(mockAnimation.playMatchAnimation).not.toHaveBeenCalled()
    })
  })

  describe('役種形成記錄', () => {
    it('應該在有新役種形成時記錄（console.info）', async () => {
      // Arrange
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
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
      await flushPromises()

      // Assert: 應該記錄役種形成
      expect(consoleSpy).toHaveBeenCalledWith(
        '[HandleTurnProgressAfterSelection] Yaku formed:',
        ['TANE']
      )

      consoleSpy.mockRestore()
    })

    it('應該在沒有新役種時跳過記錄', async () => {
      // Arrange
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
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
      await flushPromises()

      // Assert: 不應該記錄役種形成
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Yaku formed'),
        expect.anything()
      )

      consoleSpy.mockRestore()
    })
  })

  describe('更新 FlowStage', () => {
    it('應該更新 FlowStage', async () => {
      // Arrange
      const event: TurnProgressAfterSelectionEvent = {
        event_type: 'TurnProgressAfterSelection',
        event_id: 'evt-405',
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
      await flushPromises()

      // Assert
      expect(mockGameState.setFlowStage).toHaveBeenCalledWith('AWAITING_HAND_PLAY')
    })
  })

  describe('對手操作', () => {
    it('應該正確標記對手操作', async () => {
      // Arrange: player-2 是對手
      const event: TurnProgressAfterSelectionEvent = {
        event_type: 'TurnProgressAfterSelection',
        event_id: 'evt-406',
        timestamp: '2025-01-15T10:04:00Z',
        player_id: 'player-2', // 對手
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
          active_player_id: 'player-1',
        },
      }

      // Act
      useCase.execute(event)
      await flushPromises()

      // Assert: isOpponent = true
      expect(mockAnimation.playToDepositoryAnimation).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(String),
        true // isOpponent = true
      )
    })
  })
})
