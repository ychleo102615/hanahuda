/**
 * HandleTurnErrorUseCase Test
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { HandleTurnErrorUseCase } from '@/user-interface/application/use-cases/event-handlers/HandleTurnErrorUseCase'
import type { TurnErrorEvent } from '@/user-interface/application/types'
import { createMockTriggerUIEffectPort, createMockNotificationPort } from '../../test-helpers/mock-factories'
import type { TriggerUIEffectPort, NotificationPort } from '@/user-interface/application/ports'

describe('HandleTurnErrorUseCase', () => {
  let mockTriggerUIEffect: TriggerUIEffectPort
  let mockNotification: NotificationPort
  let useCase: HandleTurnErrorUseCase

  beforeEach(() => {
    mockTriggerUIEffect = createMockTriggerUIEffectPort()
    mockNotification = createMockNotificationPort()
    useCase = new HandleTurnErrorUseCase(mockTriggerUIEffect, mockNotification)
  })

  it('應該顯示錯誤訊息', () => {
    const event: TurnErrorEvent = {
      event_type: 'TurnError',
      event_id: 'evt-1101',
      timestamp: '2025-01-15T10:11:00Z',
      player_id: 'player-1',
      error_code: 'INVALID_CARD',
      error_message: 'Card not in hand',
      retry_allowed: true,
    }

    useCase.execute(event)

    expect(mockTriggerUIEffect.showErrorMessage).toHaveBeenCalledWith('Card not in hand')
  })

  it('應該處理不同的錯誤碼', () => {
    const event: TurnErrorEvent = {
      event_type: 'TurnError',
      event_id: 'evt-1102',
      timestamp: '2025-01-15T10:11:00Z',
      player_id: 'player-1',
      error_code: 'WRONG_PLAYER',
      error_message: 'Not your turn',
      retry_allowed: false,
    }

    useCase.execute(event)

    expect(mockTriggerUIEffect.showErrorMessage).toHaveBeenCalled()
  })
})
