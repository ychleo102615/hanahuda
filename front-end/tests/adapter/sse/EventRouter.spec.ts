/**
 * EventRouter Contract Tests (User Story 1)
 *
 * @description
 * 測試 EventRouter 正確路由 SSE 事件到對應的 Input Ports。
 * 根據 contracts/sse-client.md 的契約規範撰寫。
 *
 * Test Cases:
 * - T015 [US1]: Contract test for GameStarted SSE event
 * - T016 [US1]: Contract test for RoundDealt SSE event
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { EventRouter } from '@/user-interface/adapter/sse/EventRouter'
import type { InputPort } from '@/user-interface/application/ports/input'
import type {
  GameStartedEvent,
  RoundDealtEvent,
} from '@/user-interface/application/types/events'

describe('EventRouter - User Story 1 Contract Tests', () => {
  let router: EventRouter

  beforeEach(() => {
    router = new EventRouter()
  })

  describe('T015 [US1]: GameStarted Event Routing', () => {
    it('should route GameStarted event to registered Input Port', () => {
      const mockPort: InputPort<GameStartedEvent> = {
        execute: vi.fn(),
      }

      const mockPayload: GameStartedEvent = {
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

      router.register('GameStarted', mockPort)
      router.route('GameStarted', mockPayload)

      expect(mockPort.execute).toHaveBeenCalledTimes(1)
      expect(mockPort.execute).toHaveBeenCalledWith(mockPayload)
    })

    it('should handle unregistered event type gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const mockPayload: GameStartedEvent = {
        event_type: 'GameStarted',
        event_id: 'evt-001',
        timestamp: '2025-01-19T10:00:00Z',
        game_id: 'game-123',
        players: [],
        ruleset: {
          min_players: 2,
          max_players: 2,
          target_score: 7,
          deck_composition: 'HANAFUDA_48',
        },
        starting_player_id: 'player-1',
      }

      // 不註冊 handler，直接路由
      router.route('GameStarted', mockPayload)

      expect(consoleSpy).toHaveBeenCalledWith('未註冊的事件類型: GameStarted')

      consoleSpy.mockRestore()
    })

    it('should allow unregistering event handlers', () => {
      const mockPort: InputPort<GameStartedEvent> = {
        execute: vi.fn(),
      }

      router.register('GameStarted', mockPort)
      router.unregister('GameStarted')

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      router.route('GameStarted', {} as GameStartedEvent)

      expect(consoleSpy).toHaveBeenCalledWith('未註冊的事件類型: GameStarted')
      expect(mockPort.execute).not.toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    it('should allow clearing all event handlers', () => {
      const mockPort1: InputPort<GameStartedEvent> = {
        execute: vi.fn(),
      }
      const mockPort2: InputPort<RoundDealtEvent> = {
        execute: vi.fn(),
      }

      router.register('GameStarted', mockPort1)
      router.register('RoundDealt', mockPort2)
      router.clear()

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      router.route('GameStarted', {} as GameStartedEvent)
      router.route('RoundDealt', {} as RoundDealtEvent)

      expect(consoleSpy).toHaveBeenCalledTimes(2)
      expect(mockPort1.execute).not.toHaveBeenCalled()
      expect(mockPort2.execute).not.toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })

  describe('T016 [US1]: RoundDealt Event Routing', () => {
    it('should route RoundDealt event to registered Input Port', () => {
      const mockPort: InputPort<RoundDealtEvent> = {
        execute: vi.fn(),
      }

      const mockPayload: RoundDealtEvent = {
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

      router.register('RoundDealt', mockPort)
      router.route('RoundDealt', mockPayload)

      expect(mockPort.execute).toHaveBeenCalledTimes(1)
      expect(mockPort.execute).toHaveBeenCalledWith(mockPayload)
    })

    it('should support multiple event types registered simultaneously', () => {
      const mockPort1: InputPort<GameStartedEvent> = {
        execute: vi.fn(),
      }
      const mockPort2: InputPort<RoundDealtEvent> = {
        execute: vi.fn(),
      }

      const gameStartedPayload: GameStartedEvent = {
        event_type: 'GameStarted',
        event_id: 'evt-001',
        timestamp: '2025-01-19T10:00:00Z',
        game_id: 'game-123',
        players: [],
        ruleset: {
          min_players: 2,
          max_players: 2,
          target_score: 7,
          deck_composition: 'HANAFUDA_48',
        },
        starting_player_id: 'player-1',
      }

      const roundDealtPayload: RoundDealtEvent = {
        event_type: 'RoundDealt',
        event_id: 'evt-002',
        timestamp: '2025-01-19T10:00:05Z',
        dealer_id: 'player-1',
        field: [],
        hands: [],
        deck_remaining: 24,
        next_state: {
          flow_stage: 'PLAYING_HAND_CARD',
          current_player_id: 'player-1',
          round_number: 1,
          turn_number: 1,
        },
      }

      router.register('GameStarted', mockPort1)
      router.register('RoundDealt', mockPort2)

      router.route('GameStarted', gameStartedPayload)
      router.route('RoundDealt', roundDealtPayload)

      expect(mockPort1.execute).toHaveBeenCalledTimes(1)
      expect(mockPort1.execute).toHaveBeenCalledWith(gameStartedPayload)

      expect(mockPort2.execute).toHaveBeenCalledTimes(1)
      expect(mockPort2.execute).toHaveBeenCalledWith(roundDealtPayload)
    })

    it('should pass payload directly without modification', () => {
      const mockPort: InputPort<RoundDealtEvent> = {
        execute: vi.fn(),
      }

      const originalPayload: RoundDealtEvent = {
        event_type: 'RoundDealt',
        event_id: 'evt-002',
        timestamp: '2025-01-19T10:00:05Z',
        dealer_id: 'player-1',
        field: ['0111'],
        hands: [],
        deck_remaining: 47,
        next_state: {
          flow_stage: 'PLAYING_HAND_CARD',
          current_player_id: 'player-1',
          round_number: 1,
          turn_number: 1,
        },
      }

      router.register('RoundDealt', mockPort)
      router.route('RoundDealt', originalPayload)

      const receivedPayload = mockPort.execute.mock.calls[0][0]

      // 確保 payload 完全相同（未被修改）
      expect(receivedPayload).toBe(originalPayload)
      expect(receivedPayload).toEqual(originalPayload)
    })
  })

  describe('Error Handling', () => {
    it('should not throw error when routing to failing Input Port', () => {
      const mockPort: InputPort<GameStartedEvent> = {
        execute: vi.fn().mockImplementation(() => {
          throw new Error('Use Case execution failed')
        }),
      }

      router.register('GameStarted', mockPort)

      // EventRouter 不應該捕獲 Use Case 的錯誤
      // 錯誤應該向上傳播，由更高層處理
      expect(() => {
        router.route('GameStarted', {} as GameStartedEvent)
      }).toThrow('Use Case execution failed')
    })
  })
})
