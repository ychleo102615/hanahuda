/**
 * HandleRoundDrawnUseCase Test
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { HandleRoundDrawnUseCase } from '@/user-interface/application/use-cases/event-handlers/HandleRoundDrawnUseCase'
import type { RoundDrawnEvent } from '@/user-interface/application/types'
import { createMockTriggerUIEffectPort } from '../../test-helpers/mock-factories'
import type { TriggerUIEffectPort } from '@/user-interface/application/ports'

describe('HandleRoundDrawnUseCase', () => {
  let mockTriggerUIEffect: TriggerUIEffectPort
  let useCase: HandleRoundDrawnUseCase

  beforeEach(() => {
    mockTriggerUIEffect = createMockTriggerUIEffectPort()
    useCase = new HandleRoundDrawnUseCase(mockTriggerUIEffect)
  })

  it('應該處理平局事件', () => {
    const event: RoundDrawnEvent = {
      event_type: 'RoundDrawn',
      event_id: 'evt-801',
      timestamp: '2025-01-15T10:08:00Z',
      current_total_scores: [
        { player_id: 'player-1', score: 5 },
        { player_id: 'player-2', score: 3 },
      ],
    }

    expect(() => useCase.execute(event)).not.toThrow()
  })
})
