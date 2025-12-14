/**
 * HandleGameStartedUseCase Test
 *
 * @description
 * 測試 HandleGameStartedUseCase 的事件處理邏輯：
 * - 初始化遊戲上下文
 * - 顯示遊戲開始訊息
 *
 * 參考: specs/003-ui-application-layer/contracts/events.md#GameStartedEvent
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { HandleGameStartedUseCase } from '@/user-interface/application/use-cases/event-handlers/HandleGameStartedUseCase'
import type { GameStartedEvent } from '#shared/contracts'
import {
  createMockUIStatePort,
  createMockTriggerUIEffectPort,
  createMockGameStatePort,
  createMockNotificationPort,
  createMockMatchmakingStatePort,
  createMockNavigationPort,
} from '../../test-helpers/mock-factories'
import type { UIStatePort, TriggerUIEffectPort, GameStatePort, NotificationPort, MatchmakingStatePort, NavigationPort } from '@/user-interface/application/ports'

describe('HandleGameStartedUseCase', () => {
  let mockUIState: UIStatePort
  let mockTriggerUIEffect: TriggerUIEffectPort
  let mockGameState: GameStatePort
  let mockNotification: NotificationPort
  let mockMatchmakingState: MatchmakingStatePort
  let mockNavigation: NavigationPort
  let useCase: HandleGameStartedUseCase

  beforeEach(() => {
    mockUIState = createMockUIStatePort()
    mockTriggerUIEffect = createMockTriggerUIEffectPort()
    mockGameState = createMockGameStatePort()
    mockNotification = createMockNotificationPort()
    mockMatchmakingState = createMockMatchmakingStatePort()
    mockNavigation = createMockNavigationPort()
    useCase = new HandleGameStartedUseCase(mockUIState, mockGameState, mockMatchmakingState, mockNavigation)
  })

  describe('初始化遊戲上下文', () => {
    it('應該調用 initializeGameContext 初始化遊戲資訊', () => {
      // Arrange
      const event: GameStartedEvent = {
        event_type: 'GameStarted',
        event_id: 'evt-001',
        timestamp: '2025-01-15T10:00:00Z',
        game_id: 'game-123',
        players: [
          { player_id: 'player-1', player_name: 'Alice', is_ai: false },
          { player_id: 'player-2', player_name: 'Bob', is_ai: true },
        ],
        ruleset: {
          total_rounds: 2,
          target_score: 50,
          yaku_settings: [
            { yaku_type: 'GOKO', base_points: 15, enabled: true },
            { yaku_type: 'SHIKO', base_points: 10, enabled: true },
          ],
          special_rules: {
            teshi_enabled: true,
            field_kuttsuki_enabled: true,
          },
          total_deck_cards: 48,
        },
        starting_player_id: 'player-1',
      }

      // Act
      useCase.execute(event)

      // Assert
      expect(mockUIState.initializeGameContext).toHaveBeenCalledWith(
        'game-123',
        [
          { player_id: 'player-1', player_name: 'Alice', is_ai: false },
          { player_id: 'player-2', player_name: 'Bob', is_ai: true },
        ],
        {
          total_rounds: 2,
          target_score: 50,
          yaku_settings: [
            { yaku_type: 'GOKO', base_points: 15, enabled: true },
            { yaku_type: 'SHIKO', base_points: 10, enabled: true },
          ],
          special_rules: {
            teshi_enabled: true,
            field_kuttsuki_enabled: true,
          },
          total_deck_cards: 48,
        }
      )
    })

    it('應該正確傳遞所有玩家資訊', () => {
      // Arrange
      const event: GameStartedEvent = {
        event_type: 'GameStarted',
        event_id: 'evt-002',
        timestamp: '2025-01-15T10:00:00Z',
        game_id: 'game-456',
        players: [
          { player_id: 'p1', player_name: 'Player 1', is_ai: false },
          { player_id: 'p2', player_name: 'AI Opponent', is_ai: true },
        ],
        ruleset: {
          total_rounds: 2,
          target_score: 100,
          yaku_settings: [],
          special_rules: {
            teshi_enabled: false,
            field_kuttsuki_enabled: false,
          },
          total_deck_cards: 48,
        },
        starting_player_id: 'p1',
      }

      // Act
      useCase.execute(event)

      // Assert
      expect(mockUIState.initializeGameContext).toHaveBeenCalledWith(
        'game-456',
        [
          { player_id: 'p1', player_name: 'Player 1', is_ai: false },
          { player_id: 'p2', player_name: 'AI Opponent', is_ai: true },
        ],
        expect.objectContaining({
          target_score: 100,
          total_deck_cards: 48,
        })
      )
    })
  })

  // describe('顯示遊戲開始訊息', () => {
  //   it('應該觸發遊戲開始的 UI 效果', () => {
  //     // Arrange
  //     const event: GameStartedEvent = {
  //       event_type: 'GameStarted',
  //       event_id: 'evt-003',
  //       timestamp: '2025-01-15T10:00:00Z',
  //       game_id: 'game-789',
  //       players: [
  //         { player_id: 'player-1', player_name: 'Alice', is_ai: false },
  //         { player_id: 'player-2', player_name: 'Bob', is_ai: true },
  //       ],
  //       ruleset: {
  //         target_score: 50,
  //         yaku_settings: [],
  //         special_rules: {
  //           teshi_enabled: true,
  //           field_kuttsuki_enabled: true,
  //         },
  //       },
  //       starting_player_id: 'player-1',
  //     }
  //
  //     // Act
  //     useCase.execute(event)
  //
  //     // Assert
  //     expect(mockTriggerUIEffect.triggerAnimation).toHaveBeenCalled()
  //   })
  // })

  describe('邊界情況', () => {
    it('應該處理僅有 AI 玩家的情況', () => {
      // Arrange
      const event: GameStartedEvent = {
        event_type: 'GameStarted',
        event_id: 'evt-004',
        timestamp: '2025-01-15T10:00:00Z',
        game_id: 'game-ai-only',
        players: [
          { player_id: 'ai-1', player_name: 'AI 1', is_ai: true },
          { player_id: 'ai-2', player_name: 'AI 2', is_ai: true },
        ],
        ruleset: {
          total_rounds: 2,
          target_score: 50,
          yaku_settings: [],
          special_rules: {
            teshi_enabled: true,
            field_kuttsuki_enabled: true,
          },
          total_deck_cards: 48,
        },
        starting_player_id: 'ai-1',
      }

      // Act & Assert: 不應拋出錯誤
      expect(() => useCase.execute(event)).not.toThrow()
    })

    it('應該處理空的 yaku_settings', () => {
      // Arrange
      const event: GameStartedEvent = {
        event_type: 'GameStarted',
        event_id: 'evt-005',
        timestamp: '2025-01-15T10:00:00Z',
        game_id: 'game-no-yaku',
        players: [
          { player_id: 'p1', player_name: 'Player 1', is_ai: false },
          { player_id: 'p2', player_name: 'AI', is_ai: true },
        ],
        ruleset: {
          total_rounds: 2,
          target_score: 50,
          yaku_settings: [],
          special_rules: {
            teshi_enabled: true,
            field_kuttsuki_enabled: true,
          },
          total_deck_cards: 48,
        },
        starting_player_id: 'p1',
      }

      // Act
      useCase.execute(event)

      // Assert: 應該正常處理空的 yaku_settings
      expect(mockUIState.initializeGameContext).toHaveBeenCalledWith(
        'game-no-yaku',
        expect.any(Array),
        expect.objectContaining({
          yaku_settings: [],
        })
      )
    })
  })
})
