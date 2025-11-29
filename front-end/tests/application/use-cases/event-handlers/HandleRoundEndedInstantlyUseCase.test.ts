/**
 * HandleRoundEndedInstantlyUseCase Test
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { HandleRoundEndedInstantlyUseCase } from '@/user-interface/application/use-cases/event-handlers/HandleRoundEndedInstantlyUseCase'
import type { RoundEndedInstantlyEvent } from '@/user-interface/application/types'
import {
  createMockGameStatePort,
  createMockNotificationPort,
} from '../../test-helpers/mock-factories'
import type { GameStatePort, NotificationPort } from '@/user-interface/application/ports'

describe('HandleRoundEndedInstantlyUseCase', () => {
  let mockGameState: GameStatePort
  let mockNotification: NotificationPort
  let useCase: HandleRoundEndedInstantlyUseCase

  beforeEach(() => {
    mockGameState = createMockGameStatePort()
    mockNotification = createMockNotificationPort()
    useCase = new HandleRoundEndedInstantlyUseCase(mockGameState, mockNotification)
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
      display_timeout_seconds: 5,
    }

    useCase.execute(event)

    expect(mockGameState.updateScores).toHaveBeenCalledWith(6, 0)
    expect(mockNotification.startDisplayCountdown).toHaveBeenCalledWith(5)
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
      display_timeout_seconds: 5,
    }

    expect(() => useCase.execute(event)).not.toThrow()
    expect(mockNotification.startDisplayCountdown).toHaveBeenCalledWith(5)
  })
})
