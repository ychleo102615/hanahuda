/**
 * HandleRoundEndedInstantlyUseCase Test
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { HandleRoundEndedInstantlyUseCase } from '@/user-interface/application/use-cases/event-handlers/HandleRoundEndedInstantlyUseCase'
import type { RoundEndedInstantlyEvent } from '@/user-interface/application/types'
import {
  createMockUIStatePort,
  createMockTriggerUIEffectPort,
} from '../../test-helpers/mock-factories'
import type { UIStatePort, TriggerUIEffectPort } from '@/user-interface/application/ports'

describe('HandleRoundEndedInstantlyUseCase', () => {
  let mockUIState: UIStatePort
  let mockTriggerUIEffect: TriggerUIEffectPort
  let useCase: HandleRoundEndedInstantlyUseCase

  beforeEach(() => {
    mockUIState = createMockUIStatePort()
    mockTriggerUIEffect = createMockTriggerUIEffectPort()
    useCase = new HandleRoundEndedInstantlyUseCase(mockUIState, mockTriggerUIEffect)
  })

  it('應該處理 TESHI 情況並更新分數', () => {
    const event: RoundEndedInstantlyEvent = {
      event_type: 'RoundEndedInstantly',
      event_id: 'evt-901',
      timestamp: '2025-01-15T10:09:00Z',
      reason: 'TESHI',
      winner_id: 'player-1',
      awarded_points: 6,
      updated_total_scores: [
        { player_id: 'player-1', score: 6 },
        { player_id: 'player-2', score: 0 },
      ],
    }

    useCase.execute(event)

    expect(mockUIState.updateScores).toHaveBeenCalledWith(6, 0)
  })

  it('應該處理 FIELD_KUTTSUKI 情況', () => {
    const event: RoundEndedInstantlyEvent = {
      event_type: 'RoundEndedInstantly',
      event_id: 'evt-902',
      timestamp: '2025-01-15T10:09:00Z',
      reason: 'FIELD_KUTTSUKI',
      winner_id: null,
      awarded_points: 0,
      updated_total_scores: [
        { player_id: 'player-1', score: 0 },
        { player_id: 'player-2', score: 0 },
      ],
    }

    expect(() => useCase.execute(event)).not.toThrow()
  })
})
