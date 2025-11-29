/**
 * HandleRoundScoredUseCase Test
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { HandleRoundScoredUseCase } from '@/user-interface/application/use-cases/event-handlers/HandleRoundScoredUseCase'
import type { RoundScoredEvent } from '@/user-interface/application/types'
import {
  createMockUIStatePort,
  createMockNotificationPort,
  createMockDomainFacade,
} from '../../test-helpers/mock-factories'
import type { UIStatePort, NotificationPort, DomainFacade } from '@/user-interface/application'

describe('HandleRoundScoredUseCase', () => {
  let mockUIState: UIStatePort
  let mockNotification: NotificationPort
  let mockDomainFacade: DomainFacade
  let useCase: HandleRoundScoredUseCase

  beforeEach(() => {
    mockUIState = createMockUIStatePort()
    mockNotification = createMockNotificationPort()
    mockDomainFacade = createMockDomainFacade()
    useCase = new HandleRoundScoredUseCase(mockUIState, mockDomainFacade, mockNotification)
  })

  it('應該顯示回合計分面板', () => {
    const event: RoundScoredEvent = {
      event_type: 'RoundScored',
      event_id: 'evt-701',
      timestamp: '2025-01-15T10:07:00Z',
      winner_id: 'player-1',
      yaku_list: [{ yaku_type: 'TANE', base_points: 1, contributing_cards: ['0301', '0401'] }],
      base_score: 1,
      final_score: 2,
      multipliers: { player_multipliers: { 'player-1': 2, 'player-2': 1 } },
      updated_total_scores: [
        { player_id: 'player-1', score: 2 },
        { player_id: 'player-2', score: 0 },
      ],
      display_timeout_seconds: 5,
    }

    useCase.execute(event)

    expect(mockNotification.showRoundScoredModal).toHaveBeenCalledWith(
      'player-1',
      event.yaku_list,
      1,
      2,
      event.multipliers,
      event.updated_total_scores
    )
  })

  it('應該更新分數並啟動倒數', () => {
    const event: RoundScoredEvent = {
      event_type: 'RoundScored',
      event_id: 'evt-702',
      timestamp: '2025-01-15T10:07:00Z',
      winner_id: 'player-1',
      yaku_list: [],
      base_score: 1,
      final_score: 2,
      multipliers: { player_multipliers: { 'player-1': 2, 'player-2': 1 } },
      updated_total_scores: [
        { player_id: 'player-1', score: 2 },
        { player_id: 'player-2', score: 0 },
      ],
      display_timeout_seconds: 5,
    }

    useCase.execute(event)

    expect(mockUIState.updateScores).toHaveBeenCalledWith(2, 0)
    expect(mockNotification.startDisplayCountdown).toHaveBeenCalledWith(
      5,
      expect.any(Function)
    )
  })
})
