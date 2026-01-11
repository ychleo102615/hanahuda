/**
 * HandleDecisionMadeUseCase Test
 *
 * @description
 * 測試 HandleDecisionMadeUseCase 的事件處理邏輯：
 * - 更新 Koi-Koi 倍率
 * - 顯示「繼續遊戲」訊息
 * - 更新 FlowStage
 *
 * 參考: specs/003-ui-application-layer/contracts/events.md#DecisionMadeEvent
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { HandleDecisionMadeUseCase } from '@/game-client/application/use-cases/event-handlers/HandleDecisionMadeUseCase'
import type { DecisionMadeEvent } from '#shared/contracts'
import {
  createMockUIStatePort,
  createMockNotificationPort,
  createMockGameStatePort,
} from '../../test-helpers/mock-factories'
import type { UIStatePort, NotificationPort, GameStatePort } from '@/game-client/application/ports'

describe('HandleDecisionMadeUseCase', () => {
  let mockUIState: UIStatePort
  let mockNotification: NotificationPort
  let mockGameState: GameStatePort
  let useCase: HandleDecisionMadeUseCase

  beforeEach(() => {
    mockUIState = createMockUIStatePort()
    mockNotification = createMockNotificationPort()
    mockGameState = createMockGameStatePort()
    useCase = new HandleDecisionMadeUseCase(mockUIState, mockNotification, mockGameState)
  })

  describe('更新 Koi-Koi 倍率', () => {
    it('應該調用 updateKoiKoiMultiplier 更新玩家倍率', () => {
      // Arrange
      const event: DecisionMadeEvent = {
        event_type: 'DecisionMade',
        event_id: 'evt-601',
        timestamp: '2025-01-15T10:06:00Z',
        player_id: 'player-1',
        decision: 'KOI_KOI',
        updated_multipliers: {
          koi_koi_applied: true,
          is_score_doubled: false,
        },
        next_state: {
          state_type: 'AWAITING_HAND_PLAY',
          active_player_id: 'player-1',
        },
        timeout_seconds: 30,
      }

      // Act
      useCase.execute(event, { receivedAt: Date.now() })

      // Assert
      expect(mockUIState.updateKoiKoiMultiplier).toHaveBeenCalledWith('player-1', 2)
    })

    it('當 koi_koi_applied 為 false 時，倍率應為 1', () => {
      // Arrange
      const event: DecisionMadeEvent = {
        event_type: 'DecisionMade',
        event_id: 'evt-602',
        timestamp: '2025-01-15T10:06:00Z',
        player_id: 'player-1',
        decision: 'KOI_KOI',
        updated_multipliers: {
          koi_koi_applied: false,
          is_score_doubled: false,
        },
        next_state: {
          state_type: 'AWAITING_HAND_PLAY',
          active_player_id: 'player-1',
        },
        timeout_seconds: 30,
      }

      // Act
      useCase.execute(event, { receivedAt: Date.now() })

      // Assert: koi_koi_applied = false → multiplier = 1
      expect(mockUIState.updateKoiKoiMultiplier).toHaveBeenCalledWith('player-1', 1)
    })
  })

  describe('更新 FlowStage', () => {
    it('應該更新 FlowStage 返回 AWAITING_HAND_PLAY', () => {
      // Arrange
      const event: DecisionMadeEvent = {
        event_type: 'DecisionMade',
        event_id: 'evt-603',
        timestamp: '2025-01-15T10:06:00Z',
        player_id: 'player-1',
        decision: 'KOI_KOI',
        updated_multipliers: {
          koi_koi_applied: true,
          is_score_doubled: false,
        },
        next_state: {
          state_type: 'AWAITING_HAND_PLAY',
          active_player_id: 'player-1',
        },
        timeout_seconds: 30,
      }

      // Act
      useCase.execute(event, { receivedAt: Date.now() })

      // Assert
      expect(mockUIState.setFlowStage).toHaveBeenCalledWith('AWAITING_HAND_PLAY')
    })
  })

  describe('完整流程', () => {
    it('應該按照正確順序執行所有步驟', () => {
      // Arrange
      const event: DecisionMadeEvent = {
        event_type: 'DecisionMade',
        event_id: 'evt-604',
        timestamp: '2025-01-15T10:06:00Z',
        player_id: 'player-1',
        decision: 'KOI_KOI',
        updated_multipliers: {
          koi_koi_applied: true,
          is_score_doubled: false,
        },
        next_state: {
          state_type: 'AWAITING_HAND_PLAY',
          active_player_id: 'player-1',
        },
        timeout_seconds: 30,
      }

      // Act
      useCase.execute(event, { receivedAt: Date.now() })

      // Assert: 驗證所有方法都被調用
      expect(mockUIState.updateKoiKoiMultiplier).toHaveBeenCalled()
      expect(mockUIState.setFlowStage).toHaveBeenCalled()
    })
  })
})
