/**
 * SSE Client Integration Tests (User Story 4)
 *
 * @description
 * 測試完整的 SSE 事件流程:
 * GameEventClient → EventRouter → Use Case Input Ports → State Updates
 *
 * Test Cases:
 * - T080 [US4]: Integration test for complete event flow
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { EventRouter } from '@/user-interface/adapter/sse/EventRouter'
import type { InputPort } from '@/user-interface/application/ports/input'
import type {
  GameStartedEvent,
  RoundDealtEvent,
  TurnCompletedEvent,
  DecisionRequiredEvent,
  RoundScoredEvent,
  GameFinishedEvent,
} from '@/user-interface/application/types/events'

describe('SSE Client Integration Tests - User Story 4', () => {
  let router: EventRouter

  beforeEach(() => {
    router = new EventRouter()
  })

  afterEach(() => {
    router.clear()
  })

  describe('T080 [US4]: Complete Event Flow Integration', () => {
    it('should handle complete game flow from GameStarted to GameFinished', () => {
      // 模擬各個 Use Case Input Ports
      const handleGameStarted: InputPort<GameStartedEvent> = {
        execute: vi.fn(),
      }
      const handleRoundDealt: InputPort<RoundDealtEvent> = {
        execute: vi.fn(),
      }
      const handleTurnCompleted: InputPort<TurnCompletedEvent> = {
        execute: vi.fn(),
      }
      const handleDecisionRequired: InputPort<DecisionRequiredEvent> = {
        execute: vi.fn(),
      }
      const handleRoundScored: InputPort<RoundScoredEvent> = {
        execute: vi.fn(),
      }
      const handleGameFinished: InputPort<GameFinishedEvent> = {
        execute: vi.fn(),
      }

      // 註冊所有事件處理器
      router.register('GameStarted', handleGameStarted)
      router.register('RoundDealt', handleRoundDealt)
      router.register('TurnCompleted', handleTurnCompleted)
      router.register('DecisionRequired', handleDecisionRequired)
      router.register('RoundScored', handleRoundScored)
      router.register('GameFinished', handleGameFinished)

      // 模擬完整遊戲流程的事件序列

      // 1. GameStarted
      const gameStartedEvent: GameStartedEvent = {
        event_type: 'GameStarted',
        event_id: 'evt-001',
        timestamp: '2025-01-19T10:00:00Z',
        game_id: 'game-123',
        players: [
          { player_id: 'player-1', name: 'Player 1', is_local: true },
          { player_id: 'player-2', name: 'Player 2', is_local: false },
        ],
        ruleset: {
          min_players: 2,
          max_players: 2,
          target_score: 7,
          deck_composition: 'HANAFUDA_48',
        },
        starting_player_id: 'player-1',
      }
      router.route('GameStarted', gameStartedEvent)

      // 2. RoundDealt
      const roundDealtEvent: RoundDealtEvent = {
        event_type: 'RoundDealt',
        event_id: 'evt-002',
        timestamp: '2025-01-19T10:00:05Z',
        dealer_id: 'player-1',
        field: ['0111', '0211', '0311', '0411', '0511', '0611', '0711', '0811'],
        hands: [
          {
            player_id: 'player-1',
            cards: ['0112', '0212', '0312', '0412', '0512', '0612', '0712', '0812'],
          },
          {
            player_id: 'player-2',
            cards: ['0121', '0221', '0321', '0421', '0521', '0621', '0721', '0821'],
          },
        ],
        deck_remaining: 24,
        next_state: {
          flow_stage: 'PLAYING_HAND_CARD',
          current_player_id: 'player-1',
          round_number: 1,
          turn_number: 1,
        },
      }
      router.route('RoundDealt', roundDealtEvent)

      // 3. TurnCompleted (玩家打牌)
      const turnCompletedEvent: TurnCompletedEvent = {
        event_type: 'TurnCompleted',
        event_id: 'evt-003',
        timestamp: '2025-01-19T10:00:10Z',
        player_id: 'player-1',
        hand_card_play: {
          played_card: '0112',
          matched_cards: ['0111'],
          acquired_cards: ['0112', '0111'],
        },
        draw_card_play: {
          played_card: '0212',
          matched_cards: ['0211'],
          acquired_cards: ['0212', '0211'],
        },
        deck_remaining: 23,
        next_state: {
          flow_stage: 'PLAYING_HAND_CARD',
          current_player_id: 'player-2',
          round_number: 1,
          turn_number: 2,
        },
      }
      router.route('TurnCompleted', turnCompletedEvent)

      // 4. DecisionRequired (玩家形成役種)
      const decisionRequiredEvent: DecisionRequiredEvent = {
        event_type: 'DecisionRequired',
        event_id: 'evt-004',
        timestamp: '2025-01-19T10:00:15Z',
        player_id: 'player-1',
        hand_card_play: {
          played_card: '0312',
          matched_cards: ['0311'],
          acquired_cards: ['0312', '0311'],
        },
        draw_card_play: null,
        yaku_update: {
          new_yaku: [
            {
              yaku_type: 'TANE',
              base_score: 1,
              cards: ['0111', '0211', '0311', '0411', '0511'],
            },
          ],
          all_yaku: [
            {
              yaku_type: 'TANE',
              base_score: 1,
              cards: ['0111', '0211', '0311', '0411', '0511'],
            },
          ],
        },
        current_multipliers: {
          base_multiplier: 1,
          koi_koi_count: 0,
          bonus_multiplier: 1,
        },
        deck_remaining: 20,
      }
      router.route('DecisionRequired', decisionRequiredEvent)

      // 5. RoundScored (玩家選擇結束本局)
      const roundScoredEvent: RoundScoredEvent = {
        event_type: 'RoundScored',
        event_id: 'evt-005',
        timestamp: '2025-01-19T10:00:20Z',
        winner_id: 'player-1',
        yaku_list: [
          {
            yaku_type: 'TANE',
            base_score: 1,
            cards: ['0111', '0211', '0311', '0411', '0511'],
          },
        ],
        base_score: 1,
        final_score: 1,
        multipliers: {
          base_multiplier: 1,
          koi_koi_count: 0,
          bonus_multiplier: 1,
        },
        updated_total_scores: [
          { player_id: 'player-1', total_score: 1 },
          { player_id: 'player-2', total_score: 0 },
        ],
      }
      router.route('RoundScored', roundScoredEvent)

      // 6. GameFinished (目標分數達成)
      const gameFinishedEvent: GameFinishedEvent = {
        event_type: 'GameFinished',
        event_id: 'evt-006',
        timestamp: '2025-01-19T10:00:25Z',
        winner_id: 'player-1',
        final_scores: [
          { player_id: 'player-1', total_score: 7 },
          { player_id: 'player-2', total_score: 2 },
        ],
      }
      router.route('GameFinished', gameFinishedEvent)

      // 驗證所有事件都被正確路由到對應的 Use Cases
      expect(handleGameStarted.execute).toHaveBeenCalledTimes(1)
      expect(handleRoundDealt.execute).toHaveBeenCalledTimes(1)
      expect(handleTurnCompleted.execute).toHaveBeenCalledTimes(1)
      expect(handleDecisionRequired.execute).toHaveBeenCalledTimes(1)
      expect(handleRoundScored.execute).toHaveBeenCalledTimes(1)
      expect(handleGameFinished.execute).toHaveBeenCalledTimes(1)

      // 驗證事件順序正確
      const callOrder = [
        handleGameStarted.execute.mock.invocationCallOrder[0],
        handleRoundDealt.execute.mock.invocationCallOrder[0],
        handleTurnCompleted.execute.mock.invocationCallOrder[0],
        handleDecisionRequired.execute.mock.invocationCallOrder[0],
        handleRoundScored.execute.mock.invocationCallOrder[0],
        handleGameFinished.execute.mock.invocationCallOrder[0],
      ]

      // 確保事件按順序執行 (call order 嚴格遞增)
      for (let i = 1; i < callOrder.length; i++) {
        expect(callOrder[i]).toBeGreaterThan(callOrder[i - 1])
      }
    })

    it('should allow independent event registration and unregistration', () => {
      const mockPort1: InputPort<GameStartedEvent> = {
        execute: vi.fn(),
      }
      const mockPort2: InputPort<RoundDealtEvent> = {
        execute: vi.fn(),
      }

      // 註冊第一個事件
      router.register('GameStarted', mockPort1)
      router.route('GameStarted', {} as GameStartedEvent)
      expect(mockPort1.execute).toHaveBeenCalledTimes(1)

      // 註冊第二個事件
      router.register('RoundDealt', mockPort2)
      router.route('RoundDealt', {} as RoundDealtEvent)
      expect(mockPort2.execute).toHaveBeenCalledTimes(1)

      // 取消註冊第一個事件
      router.unregister('GameStarted')

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      // 第一個事件不再觸發
      router.route('GameStarted', {} as GameStartedEvent)
      expect(mockPort1.execute).toHaveBeenCalledTimes(1) // 沒有增加

      // 第二個事件仍然有效
      router.route('RoundDealt', {} as RoundDealtEvent)
      expect(mockPort2.execute).toHaveBeenCalledTimes(2)

      consoleSpy.mockRestore()
    })

    it('should clear all event handlers at once', () => {
      const mockPort1: InputPort<GameStartedEvent> = {
        execute: vi.fn(),
      }
      const mockPort2: InputPort<RoundDealtEvent> = {
        execute: vi.fn(),
      }
      const mockPort3: InputPort<TurnCompletedEvent> = {
        execute: vi.fn(),
      }

      // 註冊多個事件
      router.register('GameStarted', mockPort1)
      router.register('RoundDealt', mockPort2)
      router.register('TurnCompleted', mockPort3)

      // 清除所有事件
      router.clear()

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      // 所有事件都不再觸發
      router.route('GameStarted', {} as GameStartedEvent)
      router.route('RoundDealt', {} as RoundDealtEvent)
      router.route('TurnCompleted', {} as TurnCompletedEvent)

      expect(mockPort1.execute).not.toHaveBeenCalled()
      expect(mockPort2.execute).not.toHaveBeenCalled()
      expect(mockPort3.execute).not.toHaveBeenCalled()

      expect(consoleSpy).toHaveBeenCalledTimes(3)

      consoleSpy.mockRestore()
    })

    it('should not interfere with event routing when Use Case throws error', () => {
      const failingPort: InputPort<GameStartedEvent> = {
        execute: vi.fn().mockImplementation(() => {
          throw new Error('Use Case execution failed')
        }),
      }
      const successPort: InputPort<RoundDealtEvent> = {
        execute: vi.fn(),
      }

      router.register('GameStarted', failingPort)
      router.register('RoundDealt', successPort)

      // 第一個事件拋出錯誤
      expect(() => {
        router.route('GameStarted', {} as GameStartedEvent)
      }).toThrow('Use Case execution failed')

      // 但不影響其他事件
      expect(() => {
        router.route('RoundDealt', {} as RoundDealtEvent)
      }).not.toThrow()

      expect(successPort.execute).toHaveBeenCalledTimes(1)
    })
  })

  describe('Edge Cases', () => {
    it('should handle rapid sequential events', () => {
      const mockPort: InputPort<TurnCompletedEvent> = {
        execute: vi.fn(),
      }

      router.register('TurnCompleted', mockPort)

      // 快速連續發送 10 個事件
      for (let i = 0; i < 10; i++) {
        router.route('TurnCompleted', {
          event_type: 'TurnCompleted',
          event_id: `evt-${i}`,
          timestamp: new Date().toISOString(),
          player_id: 'player-1',
          hand_card_play: null,
          draw_card_play: null,
          deck_remaining: 20 - i,
          next_state: {
            flow_stage: 'PLAYING_HAND_CARD',
            current_player_id: 'player-2',
            round_number: 1,
            turn_number: i + 1,
          },
        })
      }

      expect(mockPort.execute).toHaveBeenCalledTimes(10)
    })

    it('should handle event type case sensitivity', () => {
      const mockPort: InputPort<GameStartedEvent> = {
        execute: vi.fn(),
      }

      router.register('GameStarted', mockPort)

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      // 錯誤的事件類型 (小寫)
      router.route('gamestarted' as any, {} as GameStartedEvent)

      // 應該被視為未註冊的事件
      expect(consoleSpy).toHaveBeenCalledWith('未註冊的事件類型: gamestarted')
      expect(mockPort.execute).not.toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })
})
