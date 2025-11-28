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
  const flushPromises = async () => {
    // 等待所有 Promise 完成（包含 350ms 的 FLIP 動畫等待）
    await new Promise(resolve => setTimeout(resolve, 400))
  }

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

      // Assert: 應該先播放翻牌飛向配對目標動畫，再播放配對動畫和轉移動畫
      expect(mockAnimation.playCardToFieldAnimation).toHaveBeenCalledWith('0501', false, '0201')
      expect(mockAnimation.playMatchAnimation).toHaveBeenCalledWith('0501', '0201')
      expect(mockAnimation.playToDepositoryAnimation).toHaveBeenCalledWith(
        ['0501', '0201'],
        'PLAIN', // targetType (mock 返回 PLAIN)
        false, // isOpponent
        undefined // matchPosition (mock 返回 undefined)
      )

      // 驗證調用順序：playCardToFieldAnimation -> playMatchAnimation -> playToDepositoryAnimation
      const playCardCall = mockAnimation.playCardToFieldAnimation.mock.invocationCallOrder[0]
      const matchCall = mockAnimation.playMatchAnimation.mock.invocationCallOrder[0]
      const depositoryCall = mockAnimation.playToDepositoryAnimation.mock.invocationCallOrder[0]
      expect(playCardCall).toBeLessThan(matchCall!)
      expect(matchCall).toBeLessThan(depositoryCall!)
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
        ['0501', '0201'],
        'PLAIN', // targetType (mock 返回 PLAIN)
        true, // isOpponent = true
        undefined // matchPosition (mock 返回 undefined)
      )
    })
  })

  describe('清除選擇狀態', () => {
    it('應該在 FlowStage 更新後清除 drawnCard 和 possibleTargetCardIds', async () => {
      // Arrange
      const event: TurnProgressAfterSelectionEvent = {
        event_type: 'TurnProgressAfterSelection',
        event_id: 'evt-407',
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

      // Assert: 應該清除選擇狀態
      expect(mockGameState.setDrawnCard).toHaveBeenCalledWith(null)
      expect(mockGameState.setPossibleTargetCardIds).toHaveBeenCalledWith([])

      // 驗證調用順序：setFlowStage 應該在 setDrawnCard 之前
      const flowStageCall = mockGameState.setFlowStage.mock.invocationCallOrder[0]
      const drawnCardCall = mockGameState.setDrawnCard.mock.invocationCallOrder[0]
      expect(flowStageCall).toBeLessThan(drawnCardCall!)
    })
  })

  describe('場牌移除與 FLIP 動畫', () => {
    it('應該在動畫完成後移除場牌，並等待 FLIP 動畫', async () => {
      // Arrange
      const event: TurnProgressAfterSelectionEvent = {
        event_type: 'TurnProgressAfterSelection',
        event_id: 'evt-408',
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

      // 記錄時間戳
      const timestamps: { action: string; time: number }[] = []
      mockAnimation.playToDepositoryAnimation.mockImplementation(async () => {
        timestamps.push({ action: 'playToDepositoryAnimation', time: Date.now() })
      })
      mockGameState.updateFieldCards.mockImplementation(() => {
        timestamps.push({ action: 'updateFieldCards', time: Date.now() })
      })

      // Act
      const startTime = Date.now()
      useCase.execute(event)

      // 等待足夠長的時間，確保包含 350ms 的 FLIP 動畫等待
      await new Promise(resolve => setTimeout(resolve, 400))

      // Assert: 驗證場牌被移除（同時移除翻牌和配對場牌）
      expect(mockGameState.updateFieldCards).toHaveBeenCalled()
      const updateFieldCardsCall = mockGameState.updateFieldCards.mock.calls[0]
      const newFieldCards = updateFieldCardsCall![0]

      // 驗證兩張卡片都被移除
      expect(newFieldCards).not.toContain('0501') // 翻牌
      expect(newFieldCards).not.toContain('0201') // 配對場牌

      // 驗證有足夠的等待時間（至少 350ms）
      const elapsedTime = Date.now() - startTime
      expect(elapsedTime).toBeGreaterThanOrEqual(350)
    })
  })
})
