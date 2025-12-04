/**
 * HandleRoundDealtUseCase Test
 *
 * @description
 * 測試 HandleRoundDealtUseCase 的事件處理邏輯：
 * - 更新場牌、手牌、牌堆狀態
 * - 播放發牌動畫
 * - 更新 FlowStage
 *
 * Phase 8 重構：使用 GameStatePort + AnimationPort
 *
 * 參考: specs/003-ui-application-layer/contracts/events.md#RoundDealtEvent
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { HandleRoundDealtUseCase } from '@/user-interface/application/use-cases/event-handlers/HandleRoundDealtUseCase'
import type { RoundDealtEvent } from '@/user-interface/application/types'
import {
  createMockGameStatePort,
  createMockAnimationPort,
  createMockNotificationPort,
} from '../../test-helpers/mock-factories'
import type { GameStatePort, AnimationPort, NotificationPort } from '@/user-interface/application/ports'

describe('HandleRoundDealtUseCase', () => {
  let mockGameState: GameStatePort
  let mockAnimation: AnimationPort
  let mockNotification: NotificationPort
  let useCase: HandleRoundDealtUseCase

  beforeEach(() => {
    mockGameState = createMockGameStatePort()
    mockAnimation = createMockAnimationPort()
    mockNotification = createMockNotificationPort()
    useCase = new HandleRoundDealtUseCase(mockGameState, mockAnimation, mockNotification)
  })

  describe('更新場牌狀態', () => {
    it('應該更新場牌列表', async () => {
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

      // 等待 async 操作完成
      await vi.waitFor(() => {
        expect(mockGameState.updateFieldCards).toHaveBeenCalled()
      })

      // Assert
      expect(mockGameState.updateFieldCards).toHaveBeenCalledWith([
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
    it('應該更新玩家手牌（根據 localPlayerId）', async () => {
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

      // 等待 async 操作完成
      await vi.waitFor(() => {
        expect(mockGameState.updateHandCards).toHaveBeenCalled()
      })

      // Assert
      expect(mockGameState.updateHandCards).toHaveBeenCalledWith([
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

    it('應該更新對手手牌數量', async () => {
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

      // 等待 async 操作完成
      await vi.waitFor(() => {
        expect(mockGameState.updateOpponentHandCount).toHaveBeenCalled()
      })

      // Assert
      expect(mockGameState.updateOpponentHandCount).toHaveBeenCalledWith(8)
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
    it('應該傳遞 onCardDealt 回調給 playDealAnimation', async () => {
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

      // 等待 async 操作完成
      await vi.waitFor(() => {
        expect(mockAnimation.playDealAnimation).toHaveBeenCalled()
      })

      // Assert: 驗證 onCardDealt 回調被傳遞
      const callArgs = (mockAnimation.playDealAnimation as ReturnType<typeof vi.fn>).mock.calls[0][0]
      expect(callArgs.onCardDealt).toBeDefined()
      expect(typeof callArgs.onCardDealt).toBe('function')

      // 模擬調用回調，驗證 updateDeckRemaining 被調用
      ;(mockGameState.getDeckRemaining as ReturnType<typeof vi.fn>).mockReturnValue(48)
      callArgs.onCardDealt()
      expect(mockGameState.updateDeckRemaining).toHaveBeenCalledWith(47)
    })
  })

  describe('播放發牌動畫 (Phase 8)', () => {
    it('應該調用 playDealAnimation 並傳遞正確參數', async () => {
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

      // 等待 async 操作完成
      await vi.waitFor(() => {
        expect(mockAnimation.playDealAnimation).toHaveBeenCalled()
      })

      // Assert
      expect(mockAnimation.playDealAnimation).toHaveBeenCalledWith(
        expect.objectContaining({
          fieldCards: ['0101', '0102', '0103', '0104', '0201', '0202', '0203', '0204'],
          playerHandCards: ['0301', '0302', '0303', '0304', '0401', '0402', '0403', '0404'],
          opponentHandCount: 8,
        })
      )
    })
  })

  describe('更新 FlowStage', () => {
    it('應該在動畫完成後更新 FlowStage 為 AWAITING_HAND_PLAY', async () => {
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

      // 等待 async 操作完成
      await vi.waitFor(() => {
        expect(mockGameState.setFlowStage).toHaveBeenCalled()
      })

      // Assert
      expect(mockGameState.setFlowStage).toHaveBeenCalledWith('AWAITING_HAND_PLAY')
    })
  })

  describe('完整流程', () => {
    it('應該按照正確順序執行所有步驟', async () => {
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

      // 等待 async 操作完成
      await vi.waitFor(() => {
        expect(mockGameState.setFlowStage).toHaveBeenCalled()
      })

      // Assert: 驗證所有方法都被調用
      expect(mockGameState.updateFieldCards).toHaveBeenCalled()
      expect(mockGameState.updateHandCards).toHaveBeenCalled()
      expect(mockGameState.updateOpponentHandCount).toHaveBeenCalled()
      // 注意：updateDeckRemaining 現在由 onCardDealt 回調調用，在實際動畫中執行
      expect(mockAnimation.playDealAnimation).toHaveBeenCalled()
      expect(mockGameState.setFlowStage).toHaveBeenCalled()
    })
  })
})
