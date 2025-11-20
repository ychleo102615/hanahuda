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
  TurnCompletedEvent,
  SelectionRequiredEvent,
  DecisionRequiredEvent,
  DecisionMadeEvent,
  RoundScoredEvent,
  GameFinishedEvent,
  TurnErrorEvent,
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

describe('EventRouter - User Story 2 Contract Tests', () => {
  let router: EventRouter

  beforeEach(() => {
    router = new EventRouter()
  })

  describe('T045 [US2]: TurnCompleted Event Routing', () => {
    it('should route TurnCompleted event to registered Input Port', () => {
      const mockPort: InputPort<TurnCompletedEvent> = {
        execute: vi.fn(),
      }

      const mockPayload: TurnCompletedEvent = {
        event_type: 'TurnCompleted',
        event_id: 'evt-003',
        timestamp: '2025-01-19T10:00:10Z',
        player_id: 'player-1',
        hand_card_play: {
          played_card: '0111',
          matched_cards: ['0112'],
          acquired_cards: ['0111', '0112'],
        },
        draw_card_play: {
          played_card: '0211',
          matched_cards: ['0212'],
          acquired_cards: ['0211', '0212'],
        },
        deck_remaining: 22,
        next_state: {
          flow_stage: 'PLAYING_HAND_CARD',
          current_player_id: 'player-2',
          round_number: 1,
          turn_number: 2,
        },
      }

      router.register('TurnCompleted', mockPort)
      router.route('TurnCompleted', mockPayload)

      expect(mockPort.execute).toHaveBeenCalledTimes(1)
      expect(mockPort.execute).toHaveBeenCalledWith(mockPayload)
    })

    it('should handle TurnCompleted with no matches', () => {
      const mockPort: InputPort<TurnCompletedEvent> = {
        execute: vi.fn(),
      }

      const mockPayload: TurnCompletedEvent = {
        event_type: 'TurnCompleted',
        event_id: 'evt-004',
        timestamp: '2025-01-19T10:00:15Z',
        player_id: 'player-1',
        hand_card_play: {
          played_card: '0111',
          matched_cards: [],
          acquired_cards: [],
        },
        draw_card_play: {
          played_card: '0211',
          matched_cards: [],
          acquired_cards: [],
        },
        deck_remaining: 22,
        next_state: {
          flow_stage: 'PLAYING_HAND_CARD',
          current_player_id: 'player-2',
          round_number: 1,
          turn_number: 2,
        },
      }

      router.register('TurnCompleted', mockPort)
      router.route('TurnCompleted', mockPayload)

      expect(mockPort.execute).toHaveBeenCalledWith(mockPayload)
    })
  })

  describe('T046 [US2]: SelectionRequired Event Routing', () => {
    it('should route SelectionRequired event to registered Input Port', () => {
      const mockPort: InputPort<SelectionRequiredEvent> = {
        execute: vi.fn(),
      }

      const mockPayload: SelectionRequiredEvent = {
        event_type: 'SelectionRequired',
        event_id: 'evt-005',
        timestamp: '2025-01-19T10:00:20Z',
        player_id: 'player-1',
        hand_card_play: {
          played_card: '0111',
          matched_cards: ['0112'],
          acquired_cards: ['0111', '0112'],
        },
        drawn_card: '0311',
        possible_targets: ['0312', '0313'],
        deck_remaining: 21,
      }

      router.register('SelectionRequired', mockPort)
      router.route('SelectionRequired', mockPayload)

      expect(mockPort.execute).toHaveBeenCalledTimes(1)
      expect(mockPort.execute).toHaveBeenCalledWith(mockPayload)
    })

    it('should pass possible_targets array correctly', () => {
      const mockPort: InputPort<SelectionRequiredEvent> = {
        execute: vi.fn(),
      }

      const mockPayload: SelectionRequiredEvent = {
        event_type: 'SelectionRequired',
        event_id: 'evt-006',
        timestamp: '2025-01-19T10:00:25Z',
        player_id: 'player-1',
        hand_card_play: {
          played_card: '0111',
          matched_cards: [],
          acquired_cards: [],
        },
        drawn_card: '0311',
        possible_targets: ['0312', '0313', '0314'],
        deck_remaining: 20,
      }

      router.register('SelectionRequired', mockPort)
      router.route('SelectionRequired', mockPayload)

      const receivedPayload = mockPort.execute.mock.calls[0][0]
      expect(receivedPayload.possible_targets).toEqual(['0312', '0313', '0314'])
      expect(receivedPayload.possible_targets.length).toBe(3)
    })

    it('should handle unregistered SelectionRequired event gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      router.route('SelectionRequired', {} as SelectionRequiredEvent)

      expect(consoleSpy).toHaveBeenCalledWith(
        '未註冊的事件類型: SelectionRequired'
      )

      consoleSpy.mockRestore()
    })
  })
})

describe('EventRouter - User Story 3 Contract Tests', () => {
  let router: EventRouter

  beforeEach(() => {
    router = new EventRouter()
  })

  describe('T064 [US3]: DecisionRequired Event Routing', () => {
    it('should route DecisionRequired event to registered Input Port', () => {
      const mockPort: InputPort<DecisionRequiredEvent> = {
        execute: vi.fn(),
      }

      const mockPayload: DecisionRequiredEvent = {
        event_type: 'DecisionRequired',
        event_id: 'evt-007',
        timestamp: '2025-01-19T10:00:30Z',
        player_id: 'player-1',
        hand_card_play: {
          played_card: '0111',
          matched_cards: ['0112'],
          acquired_cards: ['0111', '0112'],
        },
        draw_card_play: {
          played_card: '0211',
          matched_cards: ['0212'],
          acquired_cards: ['0211', '0212'],
        },
        yaku_update: {
          new_yaku: [
            {
              yaku_type: 'INO_SHIKA_CHO',
              base_score: 5,
              cards: ['0111', '0112', '0211', '0212'],
            },
          ],
          all_yaku: [
            {
              yaku_type: 'INO_SHIKA_CHO',
              base_score: 5,
              cards: ['0111', '0112', '0211', '0212'],
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

      router.register('DecisionRequired', mockPort)
      router.route('DecisionRequired', mockPayload)

      expect(mockPort.execute).toHaveBeenCalledTimes(1)
      expect(mockPort.execute).toHaveBeenCalledWith(mockPayload)
    })

    it('should handle DecisionRequired with multiple new yaku', () => {
      const mockPort: InputPort<DecisionRequiredEvent> = {
        execute: vi.fn(),
      }

      const mockPayload: DecisionRequiredEvent = {
        event_type: 'DecisionRequired',
        event_id: 'evt-008',
        timestamp: '2025-01-19T10:00:35Z',
        player_id: 'player-1',
        hand_card_play: null,
        draw_card_play: {
          played_card: '0311',
          matched_cards: ['0312'],
          acquired_cards: ['0311', '0312'],
        },
        yaku_update: {
          new_yaku: [
            {
              yaku_type: 'TANE',
              base_score: 1,
              cards: ['0111', '0211', '0311', '0411', '0511'],
            },
            {
              yaku_type: 'TAN',
              base_score: 1,
              cards: ['0112', '0212', '0312', '0412', '0512'],
            },
          ],
          all_yaku: [
            {
              yaku_type: 'TANE',
              base_score: 1,
              cards: ['0111', '0211', '0311', '0411', '0511'],
            },
            {
              yaku_type: 'TAN',
              base_score: 1,
              cards: ['0112', '0212', '0312', '0412', '0512'],
            },
          ],
        },
        current_multipliers: {
          base_multiplier: 1,
          koi_koi_count: 0,
          bonus_multiplier: 1,
        },
        deck_remaining: 18,
      }

      router.register('DecisionRequired', mockPort)
      router.route('DecisionRequired', mockPayload)

      const receivedPayload = mockPort.execute.mock.calls[0][0]
      expect(receivedPayload.yaku_update.new_yaku.length).toBe(2)
      expect(receivedPayload.yaku_update.new_yaku[0].yaku_type).toBe('TANE')
      expect(receivedPayload.yaku_update.new_yaku[1].yaku_type).toBe('TAN')
    })

    it('should handle DecisionRequired with null card plays', () => {
      const mockPort: InputPort<DecisionRequiredEvent> = {
        execute: vi.fn(),
      }

      const mockPayload: DecisionRequiredEvent = {
        event_type: 'DecisionRequired',
        event_id: 'evt-009',
        timestamp: '2025-01-19T10:00:40Z',
        player_id: 'player-1',
        hand_card_play: null,
        draw_card_play: null,
        yaku_update: {
          new_yaku: [],
          all_yaku: [],
        },
        current_multipliers: {
          base_multiplier: 1,
          koi_koi_count: 0,
          bonus_multiplier: 1,
        },
        deck_remaining: 15,
      }

      router.register('DecisionRequired', mockPort)
      router.route('DecisionRequired', mockPayload)

      const receivedPayload = mockPort.execute.mock.calls[0][0]
      expect(receivedPayload.hand_card_play).toBeNull()
      expect(receivedPayload.draw_card_play).toBeNull()
    })

    it('should handle unregistered DecisionRequired event gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      router.route('DecisionRequired', {} as DecisionRequiredEvent)

      expect(consoleSpy).toHaveBeenCalledWith(
        '未註冊的事件類型: DecisionRequired'
      )

      consoleSpy.mockRestore()
    })
  })

  describe('T065 [US3]: DecisionMade Event Routing', () => {
    it('should route DecisionMade event with KOI_KOI decision', () => {
      const mockPort: InputPort<DecisionMadeEvent> = {
        execute: vi.fn(),
      }

      const mockPayload: DecisionMadeEvent = {
        event_type: 'DecisionMade',
        event_id: 'evt-010',
        timestamp: '2025-01-19T10:00:45Z',
        player_id: 'player-1',
        decision: 'KOI_KOI',
        updated_multipliers: {
          base_multiplier: 1,
          koi_koi_count: 1,
          bonus_multiplier: 2,
        },
        next_state: {
          flow_stage: 'PLAYING_HAND_CARD',
          current_player_id: 'player-2',
          round_number: 1,
          turn_number: 3,
        },
      }

      router.register('DecisionMade', mockPort)
      router.route('DecisionMade', mockPayload)

      expect(mockPort.execute).toHaveBeenCalledTimes(1)
      expect(mockPort.execute).toHaveBeenCalledWith(mockPayload)
    })

    it('should route DecisionMade event with END_ROUND decision', () => {
      const mockPort: InputPort<DecisionMadeEvent> = {
        execute: vi.fn(),
      }

      const mockPayload: DecisionMadeEvent = {
        event_type: 'DecisionMade',
        event_id: 'evt-011',
        timestamp: '2025-01-19T10:00:50Z',
        player_id: 'player-1',
        decision: 'END_ROUND',
        updated_multipliers: {
          base_multiplier: 1,
          koi_koi_count: 0,
          bonus_multiplier: 1,
        },
        next_state: {
          flow_stage: 'ROUND_ENDED',
          current_player_id: null,
          round_number: 1,
          turn_number: 3,
        },
      }

      router.register('DecisionMade', mockPort)
      router.route('DecisionMade', mockPayload)

      expect(mockPort.execute).toHaveBeenCalledTimes(1)
      expect(mockPort.execute).toHaveBeenCalledWith(mockPayload)
    })

    it('should correctly pass updated multipliers', () => {
      const mockPort: InputPort<DecisionMadeEvent> = {
        execute: vi.fn(),
      }

      const mockPayload: DecisionMadeEvent = {
        event_type: 'DecisionMade',
        event_id: 'evt-012',
        timestamp: '2025-01-19T10:00:55Z',
        player_id: 'player-1',
        decision: 'KOI_KOI',
        updated_multipliers: {
          base_multiplier: 1,
          koi_koi_count: 2,
          bonus_multiplier: 4,
        },
        next_state: {
          flow_stage: 'PLAYING_HAND_CARD',
          current_player_id: 'player-2',
          round_number: 1,
          turn_number: 4,
        },
      }

      router.register('DecisionMade', mockPort)
      router.route('DecisionMade', mockPayload)

      const receivedPayload = mockPort.execute.mock.calls[0][0]
      expect(receivedPayload.updated_multipliers.koi_koi_count).toBe(2)
      expect(receivedPayload.updated_multipliers.bonus_multiplier).toBe(4)
    })

    it('should handle unregistered DecisionMade event gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      router.route('DecisionMade', {} as DecisionMadeEvent)

      expect(consoleSpy).toHaveBeenCalledWith(
        '未註冊的事件類型: DecisionMade'
      )

      consoleSpy.mockRestore()
    })
  })
})

describe('EventRouter - User Story 4 Contract Tests', () => {
  let router: EventRouter

  beforeEach(() => {
    router = new EventRouter()
  })

  describe('T077 [US4]: RoundScored Event Routing', () => {
    it('should route RoundScored event to registered Input Port', () => {
      const mockPort: InputPort<RoundScoredEvent> = {
        execute: vi.fn(),
      }

      const mockPayload: RoundScoredEvent = {
        event_type: 'RoundScored',
        event_id: 'evt-013',
        timestamp: '2025-01-19T10:01:00Z',
        winner_id: 'player-1',
        yaku_list: [
          {
            yaku_type: 'INO_SHIKA_CHO',
            base_score: 5,
            cards: ['0111', '0112', '0211', '0212'],
          },
          {
            yaku_type: 'TANE',
            base_score: 1,
            cards: ['0311', '0411', '0511', '0611', '0711'],
          },
        ],
        base_score: 6,
        final_score: 12,
        multipliers: {
          base_multiplier: 1,
          koi_koi_count: 1,
          bonus_multiplier: 2,
        },
        updated_total_scores: [
          { player_id: 'player-1', total_score: 12 },
          { player_id: 'player-2', total_score: 0 },
        ],
      }

      router.register('RoundScored', mockPort)
      router.route('RoundScored', mockPayload)

      expect(mockPort.execute).toHaveBeenCalledTimes(1)
      expect(mockPort.execute).toHaveBeenCalledWith(mockPayload)
    })

    it('should correctly pass yaku_list array', () => {
      const mockPort: InputPort<RoundScoredEvent> = {
        execute: vi.fn(),
      }

      const mockPayload: RoundScoredEvent = {
        event_type: 'RoundScored',
        event_id: 'evt-014',
        timestamp: '2025-01-19T10:01:05Z',
        winner_id: 'player-2',
        yaku_list: [
          {
            yaku_type: 'GOKO',
            base_score: 15,
            cards: ['0111', '0211', '0311', '0411', '0811'],
          },
        ],
        base_score: 15,
        final_score: 15,
        multipliers: {
          base_multiplier: 1,
          koi_koi_count: 0,
          bonus_multiplier: 1,
        },
        updated_total_scores: [
          { player_id: 'player-1', total_score: 0 },
          { player_id: 'player-2', total_score: 15 },
        ],
      }

      router.register('RoundScored', mockPort)
      router.route('RoundScored', mockPayload)

      const receivedPayload = mockPort.execute.mock.calls[0][0]
      expect(receivedPayload.yaku_list.length).toBe(1)
      expect(receivedPayload.yaku_list[0].yaku_type).toBe('GOKO')
      expect(receivedPayload.base_score).toBe(15)
      expect(receivedPayload.final_score).toBe(15)
    })

    it('should correctly pass updated_total_scores', () => {
      const mockPort: InputPort<RoundScoredEvent> = {
        execute: vi.fn(),
      }

      const mockPayload: RoundScoredEvent = {
        event_type: 'RoundScored',
        event_id: 'evt-015',
        timestamp: '2025-01-19T10:01:10Z',
        winner_id: 'player-1',
        yaku_list: [],
        base_score: 1,
        final_score: 8,
        multipliers: {
          base_multiplier: 1,
          koi_koi_count: 3,
          bonus_multiplier: 8,
        },
        updated_total_scores: [
          { player_id: 'player-1', total_score: 20 },
          { player_id: 'player-2', total_score: 5 },
        ],
      }

      router.register('RoundScored', mockPort)
      router.route('RoundScored', mockPayload)

      const receivedPayload = mockPort.execute.mock.calls[0][0]
      expect(receivedPayload.updated_total_scores.length).toBe(2)
      expect(receivedPayload.updated_total_scores[0].total_score).toBe(20)
      expect(receivedPayload.updated_total_scores[1].total_score).toBe(5)
    })

    it('should handle unregistered RoundScored event gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      router.route('RoundScored', {} as RoundScoredEvent)

      expect(consoleSpy).toHaveBeenCalledWith('未註冊的事件類型: RoundScored')

      consoleSpy.mockRestore()
    })
  })

  describe('T078 [US4]: GameFinished Event Routing', () => {
    it('should route GameFinished event to registered Input Port', () => {
      const mockPort: InputPort<GameFinishedEvent> = {
        execute: vi.fn(),
      }

      const mockPayload: GameFinishedEvent = {
        event_type: 'GameFinished',
        event_id: 'evt-016',
        timestamp: '2025-01-19T10:01:15Z',
        winner_id: 'player-1',
        final_scores: [
          { player_id: 'player-1', total_score: 12 },
          { player_id: 'player-2', total_score: 5 },
        ],
      }

      router.register('GameFinished', mockPort)
      router.route('GameFinished', mockPayload)

      expect(mockPort.execute).toHaveBeenCalledTimes(1)
      expect(mockPort.execute).toHaveBeenCalledWith(mockPayload)
    })

    it('should correctly pass final_scores array', () => {
      const mockPort: InputPort<GameFinishedEvent> = {
        execute: vi.fn(),
      }

      const mockPayload: GameFinishedEvent = {
        event_type: 'GameFinished',
        event_id: 'evt-017',
        timestamp: '2025-01-19T10:01:20Z',
        winner_id: 'player-2',
        final_scores: [
          { player_id: 'player-1', total_score: 3 },
          { player_id: 'player-2', total_score: 7 },
        ],
      }

      router.register('GameFinished', mockPort)
      router.route('GameFinished', mockPayload)

      const receivedPayload = mockPort.execute.mock.calls[0][0]
      expect(receivedPayload.final_scores.length).toBe(2)
      expect(receivedPayload.winner_id).toBe('player-2')
      expect(receivedPayload.final_scores[1].total_score).toBe(7)
    })

    it('should handle unregistered GameFinished event gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      router.route('GameFinished', {} as GameFinishedEvent)

      expect(consoleSpy).toHaveBeenCalledWith('未註冊的事件類型: GameFinished')

      consoleSpy.mockRestore()
    })
  })

  describe('T079 [US4]: TurnError Event Routing', () => {
    it('should route TurnError event to registered Input Port', () => {
      const mockPort: InputPort<TurnErrorEvent> = {
        execute: vi.fn(),
      }

      const mockPayload: TurnErrorEvent = {
        event_type: 'TurnError',
        event_id: 'evt-018',
        timestamp: '2025-01-19T10:01:25Z',
        player_id: 'player-1',
        error_code: 'INVALID_CARD',
        error_message: 'Card not found in player hand',
        retry_allowed: true,
      }

      router.register('TurnError', mockPort)
      router.route('TurnError', mockPayload)

      expect(mockPort.execute).toHaveBeenCalledTimes(1)
      expect(mockPort.execute).toHaveBeenCalledWith(mockPayload)
    })

    it('should correctly pass error information', () => {
      const mockPort: InputPort<TurnErrorEvent> = {
        execute: vi.fn(),
      }

      const mockPayload: TurnErrorEvent = {
        event_type: 'TurnError',
        event_id: 'evt-019',
        timestamp: '2025-01-19T10:01:30Z',
        player_id: 'player-2',
        error_code: 'NOT_YOUR_TURN',
        error_message: 'It is not your turn',
        retry_allowed: false,
      }

      router.register('TurnError', mockPort)
      router.route('TurnError', mockPayload)

      const receivedPayload = mockPort.execute.mock.calls[0][0]
      expect(receivedPayload.error_code).toBe('NOT_YOUR_TURN')
      expect(receivedPayload.error_message).toBe('It is not your turn')
      expect(receivedPayload.retry_allowed).toBe(false)
    })

    it('should handle different error codes', () => {
      const mockPort: InputPort<TurnErrorEvent> = {
        execute: vi.fn(),
      }

      const mockPayload: TurnErrorEvent = {
        event_type: 'TurnError',
        event_id: 'evt-020',
        timestamp: '2025-01-19T10:01:35Z',
        player_id: 'player-1',
        error_code: 'INVALID_STATE',
        error_message: 'Cannot play card in current state',
        retry_allowed: true,
      }

      router.register('TurnError', mockPort)
      router.route('TurnError', mockPayload)

      const receivedPayload = mockPort.execute.mock.calls[0][0]
      expect(receivedPayload.error_code).toBe('INVALID_STATE')
      expect(receivedPayload.retry_allowed).toBe(true)
    })

    it('should handle unregistered TurnError event gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      router.route('TurnError', {} as TurnErrorEvent)

      expect(consoleSpy).toHaveBeenCalledWith('未註冊的事件類型: TurnError')

      consoleSpy.mockRestore()
    })
  })
})
