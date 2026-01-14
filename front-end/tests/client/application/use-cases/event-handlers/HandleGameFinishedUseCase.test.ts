/**
 * HandleGameFinishedUseCase Test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { HandleGameFinishedUseCase } from '@/game-client/application/use-cases/event-handlers/HandleGameFinishedUseCase'
import type { GameFinishedEvent } from '#shared/contracts'
import {
  createMockNotificationPort,
  createMockUIStatePort,
  createMockGameStatePort,
  createMockGameConnectionPort,
} from '../../test-helpers/mock-factories'
import type { NotificationPort, UIStatePort, GameStatePort, GameConnectionPort } from '@/game-client/application/ports'

describe('HandleGameFinishedUseCase', () => {
  let mockNotification: NotificationPort
  let mockUIState: UIStatePort
  let mockGameState: GameStatePort
  let mockGameConnection: GameConnectionPort
  let useCase: HandleGameFinishedUseCase

  beforeEach(() => {
    mockNotification = createMockNotificationPort()
    mockUIState = createMockUIStatePort()
    mockGameState = createMockGameStatePort()
    mockGameConnection = createMockGameConnectionPort()
    useCase = new HandleGameFinishedUseCase(mockNotification, mockUIState, mockGameState, mockGameConnection)
  })

  it('當玩家獲勝時，isPlayerWinner 應為 true', () => {
    // Mock getCurrentPlayerId 返回 'player-1'
    mockUIState.getLocalPlayerId = vi.fn().mockReturnValue('player-1')

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

    useCase.execute(event, { receivedAt: Date.now() })

    // 驗證 getCurrentPlayerId 被調用
    expect(mockUIState.getLocalPlayerId).toHaveBeenCalledTimes(1)

    // 驗證 showGameFinishedModal 被正確調用，isPlayerWinner 為 true
    expect(mockNotification.showGameFinishedModal).toHaveBeenCalledTimes(1)
    expect(mockNotification.showGameFinishedModal).toHaveBeenCalledWith(
      'player-1',
      [
        { player_id: 'player-1', score: 50 },
        { player_id: 'player-2', score: 30 },
      ],
      true, // isPlayerWinner = true
    )
  })

  it('當對手獲勝時，isPlayerWinner 應為 false', () => {
    // Mock getCurrentPlayerId 返回 'player-1'
    mockUIState.getLocalPlayerId = vi.fn().mockReturnValue('player-1')

    const event: GameFinishedEvent = {
      event_type: 'GameFinished',
      event_id: 'evt-1002',
      timestamp: '2025-01-15T10:15:00Z',
      winner_id: 'player-2',
      final_scores: [
        { player_id: 'player-2', score: 100 },
        { player_id: 'player-1', score: 80 },
      ],
    }

    useCase.execute(event, { receivedAt: Date.now() })

    // 驗證 getCurrentPlayerId 被調用
    expect(mockUIState.getLocalPlayerId).toHaveBeenCalledTimes(1)

    // 驗證 showGameFinishedModal 被正確調用，isPlayerWinner 為 false
    expect(mockNotification.showGameFinishedModal).toHaveBeenCalledWith(
      'player-2',
      event.final_scores,
      false, // isPlayerWinner = false
    )
  })

  it('應該正確判斷不同 player_id 的勝負情況', () => {
    // Mock getCurrentPlayerId 返回 'player-2'（模擬玩家是 player-2）
    mockUIState.getLocalPlayerId = vi.fn().mockReturnValue('player-2')

    const event: GameFinishedEvent = {
      event_type: 'GameFinished',
      event_id: 'evt-1003',
      timestamp: '2025-01-15T10:20:00Z',
      winner_id: 'player-2',
      final_scores: [
        { player_id: 'player-1', score: 60 },
        { player_id: 'player-2', score: 70 },
      ],
    }

    useCase.execute(event, { receivedAt: Date.now() })

    // player-2 獲勝且當前玩家是 player-2，所以 isPlayerWinner 應為 true
    expect(mockNotification.showGameFinishedModal).toHaveBeenCalledWith(
      'player-2',
      event.final_scores,
      true,
    )
  })
})
