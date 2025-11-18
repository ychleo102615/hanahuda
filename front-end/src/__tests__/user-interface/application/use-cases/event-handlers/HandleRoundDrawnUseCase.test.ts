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

  it('應該呼叫 showRoundDrawnUI 並顯示平局畫面', () => {
    const event: RoundDrawnEvent = {
      event_type: 'RoundDrawn',
      event_id: 'evt-801',
      timestamp: '2025-01-15T10:08:00Z',
      current_total_scores: [
        { player_id: 'player-1', score: 5 },
        { player_id: 'player-2', score: 3 },
      ],
    }

    useCase.execute(event)

    // 驗證 showRoundDrawnUI 被正確調用
    expect(mockTriggerUIEffect.showRoundDrawnUI).toHaveBeenCalledTimes(1)
    expect(mockTriggerUIEffect.showRoundDrawnUI).toHaveBeenCalledWith([
      { player_id: 'player-1', score: 5 },
      { player_id: 'player-2', score: 3 },
    ])
  })

  it('應該正確傳遞當前總分列表', () => {
    const event: RoundDrawnEvent = {
      event_type: 'RoundDrawn',
      event_id: 'evt-802',
      timestamp: '2025-01-15T10:10:00Z',
      current_total_scores: [
        { player_id: 'player-1', score: 20 },
        { player_id: 'player-2', score: 20 },
      ],
    }

    useCase.execute(event)

    expect(mockTriggerUIEffect.showRoundDrawnUI).toHaveBeenCalledWith(
      event.current_total_scores,
    )
  })

  it('應該處理空的分數列表', () => {
    const event: RoundDrawnEvent = {
      event_type: 'RoundDrawn',
      event_id: 'evt-803',
      timestamp: '2025-01-15T10:12:00Z',
      current_total_scores: [],
    }

    useCase.execute(event)

    expect(mockTriggerUIEffect.showRoundDrawnUI).toHaveBeenCalledWith([])
  })
})
