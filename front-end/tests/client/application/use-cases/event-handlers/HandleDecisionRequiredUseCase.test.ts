/**
 * HandleDecisionRequiredUseCase Test
 *
 * @description
 * 測試 HandleDecisionRequiredUseCase 的事件處理邏輯：
 * - 觸發卡片移動動畫
 * - 更新遊戲狀態
 * - 計算當前役種與得分
 * - 顯示 Koi-Koi 決策 Modal
 * - 更新 FlowStage 為 AWAITING_DECISION
 *
 * 參考: specs/003-ui-application-layer/contracts/events.md#DecisionRequiredEvent
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { HandleDecisionRequiredUseCase } from '@/game-client/application/use-cases/event-handlers/HandleDecisionRequiredUseCase'
import type { DecisionRequiredEvent } from '#shared/contracts'
import {
  createMockUIStatePort,
  createMockDomainFacade,
  createMockNotificationPort,
  createMockGameStatePort,
  createMockAnimationPort,
} from '../../test-helpers/mock-factories'
import type { UIStatePort, GameStatePort, AnimationPort, NotificationPort } from '@/game-client/application/ports'
import type { DomainFacade } from '@/game-client/application/types/domain-facade'

describe('HandleDecisionRequiredUseCase', () => {
  let mockUIState: UIStatePort
  let mockGameState: GameStatePort
  let mockAnimation: AnimationPort
  let mockDomainFacade: DomainFacade
  let mockNotification: NotificationPort
  let useCase: HandleDecisionRequiredUseCase

  beforeEach(() => {
    mockUIState = createMockUIStatePort()
    mockGameState = createMockGameStatePort()
    mockAnimation = createMockAnimationPort()
    mockDomainFacade = createMockDomainFacade()
    mockNotification = createMockNotificationPort()
    useCase = new HandleDecisionRequiredUseCase(
      mockUIState,
      mockNotification,
      mockDomainFacade,
      mockGameState,
      mockAnimation
    )
  })

  describe('啟動 Modal 倒數', () => {
    it('應該啟動 Modal 倒數計時', async () => {
      // Arrange
      const event: DecisionRequiredEvent = {
        event_type: 'DecisionRequired',
        event_id: 'evt-501',
        timestamp: '2025-01-15T10:05:00Z',
        player_id: 'player-1',
        hand_card_play: {
          played_card: '0301',
          matched_cards: ['0101'],
        },
        draw_card_play: {
          played_card: '0302',
          matched_cards: ['0102'],
        },
        yaku_update: {
          newly_formed_yaku: [
            {
              yaku_type: 'TANE',
              base_points: 1,
              contributing_cards: ['0301', '0401', '0501', '0601', '0701'],
            },
          ],
          all_active_yaku: [
            {
              yaku_type: 'TANE',
              base_points: 1,
              contributing_cards: ['0301', '0401', '0501', '0601', '0701'],
            },
          ],
        },
        current_multipliers: {
          koi_koi_applied: false,
          is_score_doubled: false,
        },
        deck_remaining: 19,
        timeout_seconds: 30,
      }

      // Act
      await useCase.execute(event, { receivedAt: Date.now() })

      // Assert: 應該啟動顯示倒數（用於 Modal）
      expect(mockNotification.startCountdown).toHaveBeenCalled()
    })
  })

  describe('顯示決策 Modal', () => {
    it('應該調用 showDecisionModal 並傳遞役種資訊', async () => {
      // Arrange
      const event: DecisionRequiredEvent = {
        event_type: 'DecisionRequired',
        event_id: 'evt-502',
        timestamp: '2025-01-15T10:05:00Z',
        player_id: 'player-1',
        hand_card_play: null,
        draw_card_play: null,
        yaku_update: {
          newly_formed_yaku: [
            {
              yaku_type: 'TANE',
              base_points: 1,
              contributing_cards: ['0301', '0401', '0501', '0601', '0701'],
            },
          ],
          all_active_yaku: [
            {
              yaku_type: 'TANE',
              base_points: 1,
              contributing_cards: ['0301', '0401', '0501', '0601', '0701'],
            },
          ],
        },
        current_multipliers: {
          koi_koi_applied: false,
          is_score_doubled: false,
        },
        deck_remaining: 19,
        timeout_seconds: 30,
      }

      // Act
      await useCase.execute(event, { receivedAt: Date.now() })

      // Assert: 應該調用 NotificationPort 的 showDecisionModal
      expect(mockNotification.showDecisionModal).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            yaku_type: 'TANE',
            base_points: 1,
          }),
        ]),
        1  // finalScore = base_points (1) * multiplier (1)
      )
    })
  })

  describe('更新 FlowStage', () => {
    it('應該更新 FlowStage 為 AWAITING_DECISION', async () => {
      // Arrange
      const event: DecisionRequiredEvent = {
        event_type: 'DecisionRequired',
        event_id: 'evt-503',
        timestamp: '2025-01-15T10:05:00Z',
        player_id: 'player-1',
        hand_card_play: null,
        draw_card_play: null,
        yaku_update: {
          newly_formed_yaku: [
            {
              yaku_type: 'TANE',
              base_points: 1,
              contributing_cards: ['0301', '0401', '0501', '0601', '0701'],
            },
          ],
          all_active_yaku: [
            {
              yaku_type: 'TANE',
              base_points: 1,
              contributing_cards: ['0301', '0401', '0501', '0601', '0701'],
            },
          ],
        },
        current_multipliers: {
          koi_koi_applied: false,
          is_score_doubled: false,
        },
        deck_remaining: 19,
        timeout_seconds: 30,
      }

      // Act
      await useCase.execute(event, { receivedAt: Date.now() })

      // Assert
      expect(mockUIState.setFlowStage).toHaveBeenCalledWith('AWAITING_DECISION')
    })
  })
})
