/**
 * HandleReconnectionUseCase Test
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { HandleReconnectionUseCase } from '@/user-interface/application/use-cases/event-handlers/HandleReconnectionUseCase'
import type { GameSnapshotRestore } from '#shared/contracts'
import {
  createMockUIStatePort,
  createMockNotificationPort,
  createMockAnimationPort,
  createMockMatchmakingStatePort,
} from '../../test-helpers/mock-factories'
import type { UIStatePort, NotificationPort, AnimationPort, MatchmakingStatePort } from '@/user-interface/application/ports'

describe('HandleReconnectionUseCase', () => {
  let mockUIState: UIStatePort
  let mockNotification: NotificationPort
  let mockAnimation: AnimationPort
  let mockMatchmakingState: MatchmakingStatePort
  let useCase: HandleReconnectionUseCase

  beforeEach(() => {
    mockUIState = createMockUIStatePort()
    mockNotification = createMockNotificationPort()
    mockAnimation = createMockAnimationPort()
    mockMatchmakingState = createMockMatchmakingStatePort()
    useCase = new HandleReconnectionUseCase(mockUIState, mockNotification, mockAnimation, mockMatchmakingState)
  })

  it('應該恢復遊戲狀態', () => {
    const snapshot: GameSnapshotRestore = {
      game_id: 'game-123',
      players: [
        { player_id: 'player-1', player_name: 'Alice', is_ai: false },
        { player_id: 'player-2', player_name: 'Bob', is_ai: true },
      ],
      ruleset: {
        total_rounds: 2,
        yaku_settings: [],
        special_rules: { teshi_enabled: true, field_kuttsuki_enabled: true },
        total_deck_cards: 48,
      },
      field_cards: ['0101', '0102'],
      deck_remaining: 20,
      player_hands: [{ player_id: 'player-1', cards: ['0301', '0302'] }],
      player_depositories: [{ player_id: 'player-1', cards: ['0401'] }],
      player_scores: [{ player_id: 'player-1', score: 5 }],
      current_flow_stage: 'AWAITING_HAND_PLAY',
      active_player_id: 'player-1',
      koi_statuses: [{ player_id: 'player-1', koi_multiplier: 1, times_continued: 0 }],
      action_timeout_seconds: 30,
    }

    useCase.execute(snapshot)

    expect(mockUIState.restoreGameState).toHaveBeenCalledWith(snapshot)
    expect(mockNotification.showReconnectionMessage).toHaveBeenCalled()
    expect(mockNotification.startActionCountdown).toHaveBeenCalledWith(30)
    expect(mockAnimation.interrupt).toHaveBeenCalled()
    expect(mockAnimation.clearHiddenCards).toHaveBeenCalled()
    expect(mockMatchmakingState.clearSession).toHaveBeenCalled()
  })
})
