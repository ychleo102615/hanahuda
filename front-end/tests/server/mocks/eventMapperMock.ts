/**
 * EventMapper Mock
 *
 * @description
 * EventMapperPort 及其衍生介面的測試用 mock 實作。
 * 提供可配置的 mock 函數以驗證事件映射行為。
 *
 * @module server/__tests__/mocks/eventMapperMock
 */

import { vi } from 'vitest'
import type { FullEventMapperPort } from '~/server/application/ports/output/eventMapperPort'
import type { Game } from '~/server/domain/game/game'
import type {
  GameStartedEvent,
  RoundDealtEvent,
  GameSnapshotRestore,
  TurnCompletedEvent,
  SelectionRequiredEvent,
  TurnProgressAfterSelectionEvent,
  DecisionRequiredEvent,
  DecisionMadeEvent,
  RoundEndedEvent,
  GameFinishedEvent,
  GameErrorEvent,
} from '#shared/contracts'

/**
 * EventMapper Mock 類型
 */
export type MockEventMapper = {
  [K in keyof FullEventMapperPort]: ReturnType<typeof vi.fn>
}

/**
 * 建立 EventMapper Mock
 *
 * @returns 可配置的 EventMapper mock
 */
export function createMockEventMapper(): MockEventMapper {
  return {
    // Base EventMapperPort
    toGameStartedEvent: vi.fn<(game: Game) => GameStartedEvent>().mockReturnValue({
      event_type: 'GameStarted',
      game_id: 'test-game-id',
      players: [],
      starting_player_id: 'player-1',
      total_rounds: 12,
    }),

    toRoundDealtEvent: vi.fn<(game: Game) => RoundDealtEvent>().mockReturnValue({
      event_type: 'RoundDealt',
      round_number: 1,
      player_hand: [],
      opponent_hand_count: 8,
      field_cards: [],
      deck_count: 24,
      dealer_id: 'player-1',
      active_player_id: 'player-1',
      timeout_seconds: 15,
    }),

    toRoundDealtEventForSpecialRule: vi.fn<(game: Game) => RoundDealtEvent>().mockReturnValue({
      event_type: 'RoundDealt',
      round_number: 1,
      player_hand: [],
      opponent_hand_count: 8,
      field_cards: [],
      deck_count: 24,
      dealer_id: 'player-1',
      active_player_id: 'player-1',
      next_state: null,
      timeout_seconds: 0,
    }),

    toGameSnapshotRestoreEvent: vi.fn<(game: Game, remainingSeconds?: number) => GameSnapshotRestore>().mockReturnValue({
      event_type: 'GameSnapshotRestore',
      snapshot: {
        game_status: 'IN_PROGRESS',
        round_number: 1,
        player: {
          player_id: 'player-1',
          hand: [],
          depository: [],
          yaku: [],
          score: 0,
        },
        opponent: {
          player_id: 'player-2',
          hand_count: 8,
          depository: [],
          yaku: [],
          score: 0,
        },
        field_cards: [],
        deck_count: 24,
        flow_state: 'AWAITING_HAND_PLAY',
        active_player_id: 'player-1',
        pending_selection: null,
        remaining_seconds: 15,
      },
    }),

    toGameErrorEvent: vi.fn().mockReturnValue({
      event_type: 'GameError',
      error_code: 'UNKNOWN',
      message: 'Error',
      recoverable: false,
    }),

    // TurnEventMapperPort
    toTurnCompletedEvent: vi.fn().mockReturnValue({
      event_type: 'TurnCompleted',
      player_id: 'player-1',
      hand_card_play: { played_card_id: '0111', captured_card_ids: [], placed_on_field: true },
      draw_card_play: { played_card_id: '0211', captured_card_ids: [], placed_on_field: true },
      next_active_player_id: 'player-2',
      deck_count: 23,
      timeout_seconds: 15,
    }),

    toSelectionRequiredEvent: vi.fn().mockReturnValue({
      event_type: 'SelectionRequired',
      player_id: 'player-1',
      hand_card_play: { played_card_id: '0111', captured_card_ids: [], placed_on_field: true },
      drawn_card: '0131',
      possible_targets: ['0141', '0142'],
      timeout_seconds: 15,
    }),

    toDecisionRequiredEvent: vi.fn().mockReturnValue({
      event_type: 'DecisionRequired',
      player_id: 'player-1',
      hand_card_play: null,
      draw_card_play: null,
      yaku_update: { previous_yaku: [], current_yaku: [], is_new_yaku: true },
      timeout_seconds: 15,
    }),

    toRoundEndedEvent: vi.fn().mockReturnValue({
      event_type: 'RoundEnded',
      reason: 'SCORED',
      updated_scores: [],
    }),

    toGameFinishedEvent: vi.fn().mockReturnValue({
      event_type: 'GameFinished',
      winner_id: 'player-1',
      final_scores: [],
      reason: 'SCORED',
    }),

    // SelectionEventMapperPort
    toTurnProgressAfterSelectionEvent: vi.fn().mockReturnValue({
      event_type: 'TurnProgressAfterSelection',
      player_id: 'player-1',
      selection: { source_card_id: '0131', target_card_id: '0141' },
      draw_card_play: { played_card_id: '0211', captured_card_ids: [], placed_on_field: true },
      yaku_update: null,
      next_active_player_id: 'player-2',
      deck_count: 23,
      timeout_seconds: 15,
    }),

    // DecisionEventMapperPort
    toDecisionMadeEvent: vi.fn().mockReturnValue({
      event_type: 'DecisionMade',
      player_id: 'player-1',
      decision: 'KOI_KOI',
      multipliers: { koi_koi_multiplier: 2, seven_point_multiplier: 1, total_multiplier: 2 },
      next_active_player_id: 'player-2',
      timeout_seconds: 15,
    }),
  }
}
