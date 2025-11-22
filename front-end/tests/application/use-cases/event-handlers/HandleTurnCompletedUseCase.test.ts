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

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { HandleTurnCompletedUseCase } from '@/user-interface/application/use-cases/event-handlers/HandleTurnCompletedUseCase'
import type { TurnCompletedEvent } from '@/user-interface/application/types'
import {
  createMockGameStatePort,
  createMockAnimationPort,
  createMockDomainFacade,
} from '../../test-helpers/mock-factories'
import type { GameStatePort, AnimationPort } from '@/user-interface/application/ports'
import type { DomainFacade } from '@/user-interface/application/types'

describe('HandleTurnCompletedUseCase', () => {
  let mockGameState: GameStatePort
  let mockAnimation: AnimationPort
  let mockDomainFacade: DomainFacade
  let useCase: HandleTurnCompletedUseCase

  beforeEach(() => {
    mockGameState = createMockGameStatePort()
    mockAnimation = createMockAnimationPort()
    mockDomainFacade = createMockDomainFacade()
    useCase = new HandleTurnCompletedUseCase(mockGameState, mockAnimation, mockDomainFacade)
  })

  // Helper: 等待異步操作完成
  const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0))

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
      await flushPromises()

      // Assert: 應該播放配對動畫
      expect(mockAnimation.playMatchAnimation).toHaveBeenCalledWith('0301', '0101')
      expect(mockAnimation.playToDepositoryAnimation).toHaveBeenCalledWith(
        ['0301', '0101'],
        'PLAIN', // mockDomainFacade 預設返回 'PLAIN'
        false // isOpponent = false (player-1 is local player)
      )
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
      await flushPromises()

      // Assert: 應該播放移至場牌動畫
      expect(mockAnimation.playCardToFieldAnimation).toHaveBeenCalledWith('0301', false)
      expect(mockAnimation.playMatchAnimation).not.toHaveBeenCalled()
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

    it('應該處理 draw_card_play 為 null 的情況', async () => {
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

  describe('翻牌配對動畫', () => {
    it('應該在翻牌有配對時播放配對動畫', async () => {
      // Arrange
      const event: TurnCompletedEvent = {
        event_type: 'TurnCompleted',
        event_id: 'evt-205',
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

      // Act
      useCase.execute(event)
      await flushPromises()

      // Assert: 應該播放翻牌配對動畫（不含 playFlipFromDeckAnimation，那是 Phase 8）
      expect(mockAnimation.playMatchAnimation).toHaveBeenCalledWith('0302', '0102')
      expect(mockAnimation.playToDepositoryAnimation).toHaveBeenCalled()
    })

    it('應該在翻牌無配對時不播放任何動畫', async () => {
      // Arrange
      const event: TurnCompletedEvent = {
        event_type: 'TurnCompleted',
        event_id: 'evt-206',
        timestamp: '2025-01-15T10:02:00Z',
        player_id: 'player-1',
        hand_card_play: null,
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

      // Act
      useCase.execute(event)
      await flushPromises()

      // Assert: 翻牌無配對時不播放動畫（牌已在場上）
      expect(mockAnimation.playMatchAnimation).not.toHaveBeenCalled()
      expect(mockAnimation.playCardToFieldAnimation).not.toHaveBeenCalled()
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
          matched_card: '0101',
          captured_cards: ['0301', '0101'],
        },
        draw_card_play: null,
        deck_remaining: 22,
        next_state: {
          state_type: 'AWAITING_HAND_PLAY',
          active_player_id: 'player-2',
        },
      }

      // Act
      useCase.execute(event)
      await flushPromises()

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
      await flushPromises()

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
          matched_card: '0101',
          captured_cards: ['0301', '0101'],
        },
        draw_card_play: null,
        deck_remaining: 23,
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
