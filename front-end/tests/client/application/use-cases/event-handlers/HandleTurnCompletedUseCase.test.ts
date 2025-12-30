/**
 * HandleTurnCompletedUseCase Test
 *
 * @description
 * 測試 HandleTurnCompletedUseCase 的事件處理邏輯：
 * - 播放配對動畫（有配對時）
 * - 播放移至場牌動畫（無配對時）
 * - 更新牌堆剩餘數量
 * - 更新 FlowStage
 *
 * Phase 7 更新：使用 GameStatePort + AnimationPort 替代舊介面
 *
 * 參考: specs/003-ui-application-layer/contracts/events.md#TurnCompletedEvent
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { HandleTurnCompletedUseCase } from '@/user-interface/application/use-cases/event-handlers/HandleTurnCompletedUseCase'
import type { TurnCompletedEvent } from '#shared/contracts'
import {
  createMockGameStatePort,
  createMockAnimationPort,
  createMockNotificationPort,
  createMockDomainFacade,
} from '../../test-helpers/mock-factories'
import type { GameStatePort, AnimationPort, NotificationPort } from '@/user-interface/application/ports'
import type { DomainFacade } from '@/user-interface/application/types/domain-facade'

describe('HandleTurnCompletedUseCase', () => {
  let mockGameState: GameStatePort
  let mockAnimation: AnimationPort
  let mockNotification: NotificationPort
  let mockDomainFacade: DomainFacade
  let useCase: HandleTurnCompletedUseCase

  beforeEach(() => {
    mockGameState = createMockGameStatePort()
    mockAnimation = createMockAnimationPort()
    mockNotification = createMockNotificationPort()
    mockDomainFacade = createMockDomainFacade()
    useCase = new HandleTurnCompletedUseCase(mockGameState, mockAnimation, mockNotification, mockDomainFacade)
  })

  describe('播放配對動畫', () => {
    it('應該在有配對時播放 playMatchAnimation + playToDepositoryAnimation', async () => {
      // Arrange
      const event: TurnCompletedEvent = {
        event_type: 'TurnCompleted',
        event_id: 'evt-201',
        timestamp: '2025-01-15T10:02:00Z',
        player_id: 'player-1',
        hand_card_play: {
          played_card: '0301',
          matched_cards: ['0101'],
        },
        draw_card_play: null,
        deck_remaining: 23,
        next_state: {
          state_type: 'AWAITING_HAND_PLAY',
          active_player_id: 'player-2',
        },
        timeout_seconds: 30,
      }

      // Act
      await useCase.execute(event, { receivedAt: Date.now() })

      // Assert: 應該呼叫高階動畫 API
      expect(mockAnimation.playCardPlaySequence).toHaveBeenCalled()
    })

    it('應該在無配對時播放 playCardToFieldAnimation', async () => {
      // Arrange
      const event: TurnCompletedEvent = {
        event_type: 'TurnCompleted',
        event_id: 'evt-202',
        timestamp: '2025-01-15T10:02:00Z',
        player_id: 'player-1',
        hand_card_play: {
          played_card: '0301',
          matched_cards: [],
        },
        draw_card_play: null,
        deck_remaining: 23,
        next_state: {
          state_type: 'AWAITING_HAND_PLAY',
          active_player_id: 'player-2',
        },
        timeout_seconds: 30,
      }

      // Act
      await useCase.execute(event, { receivedAt: Date.now() })

      // Assert: 應該呼叫高階動畫 API（無配對時 capturedCards 為空）
      expect(mockAnimation.playCardPlaySequence).toHaveBeenCalled()
    })

    it('應該處理 hand_card_play 為 null 的情況', async () => {
      // Arrange
      const event: TurnCompletedEvent = {
        event_type: 'TurnCompleted',
        event_id: 'evt-203',
        timestamp: '2025-01-15T10:02:00Z',
        player_id: 'player-1',
        hand_card_play: null,
        draw_card_play: {
          played_card: '0302',
          matched_cards: ['0102'],
        },
        deck_remaining: 22,
        next_state: {
          state_type: 'AWAITING_HAND_PLAY',
          active_player_id: 'player-2',
        },
        timeout_seconds: 30,
      }

      // Act & Assert: 不應拋出錯誤
      await expect(useCase.execute(event, { receivedAt: Date.now() })).resolves.not.toThrow()
    })

    it('應該處理 draw_card_play 為 null 的情況', async () => {
      // Arrange
      const event: TurnCompletedEvent = {
        event_type: 'TurnCompleted',
        event_id: 'evt-204',
        timestamp: '2025-01-15T10:02:00Z',
        player_id: 'player-1',
        hand_card_play: {
          played_card: '0301',
          matched_cards: ['0101'],
        },
        draw_card_play: null,
        deck_remaining: 23,
        next_state: {
          state_type: 'AWAITING_HAND_PLAY',
          active_player_id: 'player-2',
        },
        timeout_seconds: 30,
      }

      // Act & Assert: 不應拋出錯誤
      await expect(useCase.execute(event, { receivedAt: Date.now() })).resolves.not.toThrow()
    })
  })

  describe('翻牌配對動畫', () => {
    it('應該在翻牌有配對時呼叫 playDrawCardSequence', async () => {
      // Arrange
      const event: TurnCompletedEvent = {
        event_type: 'TurnCompleted',
        event_id: 'evt-205',
        timestamp: '2025-01-15T10:02:00Z',
        player_id: 'player-1',
        hand_card_play: null,
        draw_card_play: {
          played_card: '0302',
          matched_cards: ['0102'],
        },
        deck_remaining: 22,
        next_state: {
          state_type: 'AWAITING_HAND_PLAY',
          active_player_id: 'player-2',
        },
        timeout_seconds: 30,
      }

      // Act
      await useCase.execute(event, { receivedAt: Date.now() })

      // Assert: 應該呼叫高階動畫 API
      expect(mockAnimation.playDrawCardSequence).toHaveBeenCalled()
    })

    it('應該在翻牌無配對時呼叫 playDrawCardSequence（capturedCards 為空）', async () => {
      // Arrange
      const event: TurnCompletedEvent = {
        event_type: 'TurnCompleted',
        event_id: 'evt-206',
        timestamp: '2025-01-15T10:02:00Z',
        player_id: 'player-1',
        hand_card_play: null,
        draw_card_play: {
          played_card: '0302',
          matched_cards: [],
        },
        deck_remaining: 22,
        next_state: {
          state_type: 'AWAITING_HAND_PLAY',
          active_player_id: 'player-2',
        },
        timeout_seconds: 30,
      }

      // Act
      await useCase.execute(event, { receivedAt: Date.now() })

      // Assert: 應該呼叫高階動畫 API
      expect(mockAnimation.playDrawCardSequence).toHaveBeenCalled()
    })
  })

  describe('更新牌堆剩餘數量', () => {
    it('應該更新牌堆剩餘數量', async () => {
      // Arrange
      const event: TurnCompletedEvent = {
        event_type: 'TurnCompleted',
        event_id: 'evt-207',
        timestamp: '2025-01-15T10:02:00Z',
        player_id: 'player-1',
        hand_card_play: {
          played_card: '0301',
          matched_cards: ['0101'],
        },
        draw_card_play: null,
        deck_remaining: 22,
        next_state: {
          state_type: 'AWAITING_HAND_PLAY',
          active_player_id: 'player-2',
        },
        timeout_seconds: 30,
      }

      // Act
      await useCase.execute(event, { receivedAt: Date.now() })

      // Assert
      expect(mockGameState.updateDeckRemaining).toHaveBeenCalledWith(22)
    })
  })

  describe('更新 FlowStage', () => {
    it('應該更新 FlowStage', async () => {
      // Arrange
      const event: TurnCompletedEvent = {
        event_type: 'TurnCompleted',
        event_id: 'evt-208',
        timestamp: '2025-01-15T10:02:00Z',
        player_id: 'player-1',
        hand_card_play: {
          played_card: '0301',
          matched_cards: [],
        },
        draw_card_play: null,
        deck_remaining: 23,
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
      const event: TurnCompletedEvent = {
        event_type: 'TurnCompleted',
        event_id: 'evt-209',
        timestamp: '2025-01-15T10:02:00Z',
        player_id: 'player-2', // 對手
        hand_card_play: {
          played_card: '0301',
          matched_cards: ['0101'],
        },
        draw_card_play: null,
        deck_remaining: 23,
        next_state: {
          state_type: 'AWAITING_HAND_PLAY',
          active_player_id: 'player-1',
        },
        timeout_seconds: 30,
      }

      // Act
      await useCase.execute(event, { receivedAt: Date.now() })

      // Assert: 應該以 isOpponent=true 呼叫高階動畫 API
      expect(mockAnimation.playCardPlaySequence).toHaveBeenCalledWith(
        expect.objectContaining({ isOpponent: true }),
        expect.any(Object)
      )
    })
  })
})
