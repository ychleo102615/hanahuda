/**
 * HandleReconnectionUseCase Test
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { HandleReconnectionUseCase } from '@/user-interface/application/use-cases/event-handlers/HandleReconnectionUseCase'
import type { GameSnapshotRestore } from '@/user-interface/application/types'
import {
  createMockUpdateUIStatePort,
  createMockTriggerUIEffectPort,
} from '../../test-helpers/mock-factories'
import type { UpdateUIStatePort, TriggerUIEffectPort } from '@/user-interface/application/ports'

describe('HandleReconnectionUseCase', () => {
  let mockUpdateUIState: UpdateUIStatePort
  let mockTriggerUIEffect: TriggerUIEffectPort
  let useCase: HandleReconnectionUseCase

  beforeEach(() => {
    mockUpdateUIState = createMockUpdateUIStatePort()
    mockTriggerUIEffect = createMockTriggerUIEffectPort()
    useCase = new HandleReconnectionUseCase(mockUpdateUIState, mockTriggerUIEffect)
  })

  it('應該恢復遊戲狀態', () => {
    const snapshot: GameSnapshotRestore = {
      game_id: 'game-123',
      players: [
        { player_id: 'player-1', player_name: 'Alice', is_ai: false },
        { player_id: 'player-2', player_name: 'Bob', is_ai: true },
      ],
      ruleset: {
        target_score: 50,
        yaku_settings: [],
        special_rules: { teshi_enabled: true, field_kuttsuki_enabled: true },
      },
      field_cards: ['0101', '0102'],
      deck_remaining: 20,
      player_hands: [{ player_id: 'player-1', cards: ['0301', '0302'] }],
      player_depositories: [{ player_id: 'player-1', cards: ['0401'] }],
      player_scores: [{ player_id: 'player-1', score: 5 }],
      current_flow_stage: 'AWAITING_HAND_PLAY',
      active_player_id: 'player-1',
      koi_statuses: [{ player_id: 'player-1', koi_multiplier: 1, times_continued: 0 }],
    }

    useCase.execute(snapshot)

    expect(mockUpdateUIState.restoreGameState).toHaveBeenCalledWith(snapshot)
    expect(mockTriggerUIEffect.showReconnectionMessage).toHaveBeenCalled()
  })
})
