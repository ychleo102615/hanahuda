/**
 * HandleGameFinishedUseCase Test
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { HandleGameFinishedUseCase } from '@/user-interface/application/use-cases/event-handlers/HandleGameFinishedUseCase'
import type { GameFinishedEvent } from '@/user-interface/application/types'
import { createMockTriggerUIEffectPort } from '../../test-helpers/mock-factories'
import type { TriggerUIEffectPort } from '@/user-interface/application/ports'

describe('HandleGameFinishedUseCase', () => {
  let mockTriggerUIEffect: TriggerUIEffectPort
  let useCase: HandleGameFinishedUseCase

  beforeEach(() => {
    mockTriggerUIEffect = createMockTriggerUIEffectPort()
    useCase = new HandleGameFinishedUseCase(mockTriggerUIEffect)
  })

  it('應該處理遊戲結束事件', () => {
    const event: GameFinishedEvent = {
      event_type: 'GameFinished',
      event_id: 'evt-1001',
      timestamp: '2025-01-15T10:10:00Z',
      winner_id: 'player-1',
      final_scores: [
        { player_id: 'player-1', score: 50 },
        { player_id: 'player-2', score: 30 },
      ],
    }

    expect(() => useCase.execute(event)).not.toThrow()
  })
})
