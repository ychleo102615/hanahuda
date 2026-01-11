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

import { describe, it, expect, beforeEach } from 'vitest'
import { HandleTurnProgressAfterSelectionUseCase } from '@/game-client/application/use-cases/event-handlers/HandleTurnProgressAfterSelectionUseCase'
import type { TurnProgressAfterSelectionEvent } from '#shared/contracts'
import {
  createMockGameStatePort,
  createMockAnimationPort,
  createMockDomainFacade,
  createMockNotificationPort,
  createMockDelayPort,
} from '../../test-helpers/mock-factories'
import type { GameStatePort, AnimationPort, NotificationPort, DelayPort } from '@/game-client/application/ports'
import type { DomainFacade } from '@/game-client/application/types/domain-facade'

describe('HandleTurnProgressAfterSelectionUseCase', () => {
  let mockGameState: GameStatePort
  let mockAnimation: AnimationPort
  let mockDomainFacade: DomainFacade
  let mockNotification: NotificationPort
  let mockDelay: DelayPort
  let useCase: HandleTurnProgressAfterSelectionUseCase

  beforeEach(() => {
    mockGameState = createMockGameStatePort()
    mockAnimation = createMockAnimationPort()
    mockDomainFacade = createMockDomainFacade()
    mockNotification = createMockNotificationPort()
    mockDelay = createMockDelayPort()
    useCase = new HandleTurnProgressAfterSelectionUseCase(
      mockGameState,
      mockAnimation,
      mockDomainFacade,
      mockNotification,
      mockDelay
    )
  })

  describe('播放配對動畫', () => {
    it('應該先播放翻牌飛向配對目標動畫，再播放配對動畫', async () => {
      // Arrange
      const event: TurnProgressAfterSelectionEvent = {
        event_type: 'TurnProgressAfterSelection',
        event_id: 'evt-401',
        timestamp: '2025-01-15T10:04:00Z',
        player_id: 'player-1',
        selection: {
          source_card: '0401',
          selected_target: '0102',
        },
        draw_card_play: {
          played_card: '0501',
          matched_cards: ['0201'],
        },
        yaku_update: null,
        deck_remaining: 20,
        next_state: {
          state_type: 'AWAITING_HAND_PLAY',
          active_player_id: 'player-2',
        },
        timeout_seconds: 30,
      }

      // Act
      await useCase.execute(event, { receivedAt: Date.now() })

      // Assert: 應該呼叫高階動畫 API
      expect(mockAnimation.playDrawnCardMatchSequence).toHaveBeenCalled()
    })

    it('應該在翻牌無配對時不播放配對動畫', async () => {
      // Arrange
      const event: TurnProgressAfterSelectionEvent = {
        event_type: 'TurnProgressAfterSelection',
        event_id: 'evt-402',
        timestamp: '2025-01-15T10:04:00Z',
        player_id: 'player-1',
        selection: {
          source_card: '0401',
          selected_target: '0102',
        },
        draw_card_play: {
          played_card: '0501',
          matched_cards: [],
        },
        yaku_update: null,
        deck_remaining: 20,
        next_state: {
          state_type: 'AWAITING_HAND_PLAY',
          active_player_id: 'player-2',
        },
        timeout_seconds: 30,
      }

      // Act
      await useCase.execute(event, { receivedAt: Date.now() })

      // Assert: 翻牌無配對時不播放配對動畫
      expect(mockAnimation.playDrawnCardMatchSequence).not.toHaveBeenCalled()
    })
  })

  describe('役種形成記錄', () => {
    it('應該在有新役種形成時顯示對手役種公告', async () => {
      // Arrange
      const event: TurnProgressAfterSelectionEvent = {
        event_type: 'TurnProgressAfterSelection',
        event_id: 'evt-403',
        timestamp: '2025-01-15T10:04:00Z',
        player_id: 'player-2', // 對手
        selection: {
          source_card: '0401',
          selected_target: '0102',
        },
        draw_card_play: {
          played_card: '0501',
          matched_cards: [],
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
          active_player_id: 'player-1',
        },
        timeout_seconds: 30,
      }

      // Act
      await useCase.execute(event, { receivedAt: Date.now() })

      // Assert: 對手役種應該顯示公告
      expect(mockNotification.showOpponentYakuAnnouncement).toHaveBeenCalled()
    })

    it('應該在沒有新役種時不顯示公告', async () => {
      // Arrange
      const event: TurnProgressAfterSelectionEvent = {
        event_type: 'TurnProgressAfterSelection',
        event_id: 'evt-404',
        timestamp: '2025-01-15T10:04:00Z',
        player_id: 'player-1',
        selection: {
          source_card: '0401',
          selected_target: '0102',
        },
        draw_card_play: {
          played_card: '0501',
          matched_cards: [],
        },
        yaku_update: null,
        deck_remaining: 20,
        next_state: {
          state_type: 'AWAITING_HAND_PLAY',
          active_player_id: 'player-2',
        },
        timeout_seconds: 30,
      }

      // Act
      await useCase.execute(event, { receivedAt: Date.now() })

      // Assert: 不應該顯示公告
      expect(mockNotification.showOpponentYakuAnnouncement).not.toHaveBeenCalled()
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
        },
        draw_card_play: {
          played_card: '0501',
          matched_cards: [],
        },
        yaku_update: null,
        deck_remaining: 20,
        next_state: {
          state_type: 'AWAITING_HAND_PLAY',
          active_player_id: 'player-2',
        },
        timeout_seconds: 30,
      }

      // Act
      await useCase.execute(event, { receivedAt: Date.now() })

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
        },
        draw_card_play: {
          played_card: '0501',
          matched_cards: ['0201'],
        },
        yaku_update: null,
        deck_remaining: 20,
        next_state: {
          state_type: 'AWAITING_HAND_PLAY',
          active_player_id: 'player-1',
        },
        timeout_seconds: 30,
      }

      // Act
      await useCase.execute(event, { receivedAt: Date.now() })

      // Assert: isOpponent = true 應該傳入高階動畫 API
      expect(mockAnimation.playDrawnCardMatchSequence).toHaveBeenCalledWith(
        expect.objectContaining({ isOpponent: true }),
        expect.any(Object)
      )
    })
  })

  describe('清除選擇狀態', () => {
    it('應該清除 drawnCard 和 possibleTargetCardIds', async () => {
      // Arrange
      const event: TurnProgressAfterSelectionEvent = {
        event_type: 'TurnProgressAfterSelection',
        event_id: 'evt-407',
        timestamp: '2025-01-15T10:04:00Z',
        player_id: 'player-1',
        selection: {
          source_card: '0401',
          selected_target: '0102',
        },
        draw_card_play: {
          played_card: '0501',
          matched_cards: ['0201'],
        },
        yaku_update: null,
        deck_remaining: 20,
        next_state: {
          state_type: 'AWAITING_HAND_PLAY',
          active_player_id: 'player-2',
        },
        timeout_seconds: 30,
      }

      // Act
      await useCase.execute(event, { receivedAt: Date.now() })

      // Assert: 應該清除選擇狀態
      expect(mockGameState.setDrawnCard).toHaveBeenCalledWith(null)
      expect(mockGameState.setPossibleTargetCardIds).toHaveBeenCalledWith([])
    })
  })
})
