/**
 * HandleRoundDrawnUseCase Test
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { HandleRoundDrawnUseCase } from '@/user-interface/application/use-cases/event-handlers/HandleRoundDrawnUseCase'
import type { RoundDrawnEvent } from '@/user-interface/application/types'
import { createMockNotificationPort } from '../../test-helpers/mock-factories'
import type { NotificationPort } from '@/user-interface/application/ports'

describe('HandleRoundDrawnUseCase', () => {
  let mockNotification: NotificationPort
  let useCase: HandleRoundDrawnUseCase

  beforeEach(() => {
    mockNotification = createMockNotificationPort()
    useCase = new HandleRoundDrawnUseCase(mockNotification)
  })

  it('應該呼叫 showRoundDrawnModal 並顯示平局畫面', () => {
    const event: RoundDrawnEvent = {
      event_type: 'RoundDrawn',
      event_id: 'evt-801',
      timestamp: '2025-01-15T10:08:00Z',
      current_total_scores: [
        { player_id: 'player-1', score: 5 },
        { player_id: 'player-2', score: 3 },
      ],
      display_timeout_seconds: 5,
    }

    useCase.execute(event)

    // 驗證 showRoundDrawnModal 被正確調用
    expect(mockNotification.showRoundDrawnModal).toHaveBeenCalledTimes(1)
    expect(mockNotification.showRoundDrawnModal).toHaveBeenCalledWith([
      { player_id: 'player-1', score: 5 },
      { player_id: 'player-2', score: 3 },
    ])
    expect(mockNotification.startDisplayCountdown).toHaveBeenCalledWith(5)
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
      display_timeout_seconds: 5,
    }

    useCase.execute(event)

    expect(mockNotification.showRoundDrawnModal).toHaveBeenCalledWith(
      event.current_total_scores,
    )
    expect(mockNotification.startDisplayCountdown).toHaveBeenCalledWith(5)
  })

  it('應該處理空的分數列表', () => {
    const event: RoundDrawnEvent = {
      event_type: 'RoundDrawn',
      event_id: 'evt-803',
      timestamp: '2025-01-15T10:12:00Z',
      current_total_scores: [],
      display_timeout_seconds: 5,
    }

    useCase.execute(event)

    expect(mockNotification.showRoundDrawnModal).toHaveBeenCalledWith([])
    expect(mockNotification.startDisplayCountdown).toHaveBeenCalledWith(5)
  })
})
