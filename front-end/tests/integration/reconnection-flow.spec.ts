/**
 * 斷線重連完整流程整合測試
 *
 * @description
 * 測試使用者在遊戲中斷線並重連成功後的完整流程：
 * 1. 使用者在遊戲中斷線
 * 2. 重連成功，收到 GameSnapshotRestore 事件
 * 3. HandleReconnectionUseCase 清除 matchmakingState
 * 4. 使用者嘗試進入大廳時被 lobbyPageGuard 攔截，重定向至 /game
 * 5. 遊戲狀態完全恢復
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGameStateStore } from '@/user-interface/adapter/stores/gameState'
import { useMatchmakingStateStore } from '@/user-interface/adapter/stores/matchmakingState'
import { HandleReconnectionUseCase } from '@/user-interface/application/use-cases/event-handlers/HandleReconnectionUseCase'
import { lobbyPageGuard } from '@/user-interface/adapter/router/guards'
import type { GameSnapshotRestore } from '@/user-interface/application/types/events'
import type {
  UIStatePort,
  NotificationPort,
  AnimationPort,
  MatchmakingStatePort,
} from '@/user-interface/application/ports/output'
import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router'

describe('Reconnection Flow - Integration Test', () => {
  let handleReconnectionUseCase: HandleReconnectionUseCase
  let mockUIStatePort: UIStatePort
  let mockNotificationPort: NotificationPort
  let mockAnimationPort: AnimationPort
  let matchmakingStatePort: MatchmakingStatePort
  let gameState: ReturnType<typeof useGameStateStore>
  let matchmakingState: ReturnType<typeof useMatchmakingStateStore>

  beforeEach(() => {
    // 建立新的 Pinia 實例
    setActivePinia(createPinia())

    gameState = useGameStateStore()
    matchmakingState = useMatchmakingStateStore()

    // 建立 Mock Ports
    mockUIStatePort = {
      initializeGameContext: vi.fn(),
      restoreGameState: vi.fn(),
      updateHandCards: vi.fn(),
      updateFieldCards: vi.fn(),
      updateDepositoryCards: vi.fn(),
      updateOpponentHandCount: vi.fn(),
      updateOpponentDepositoryCards: vi.fn(),
      updateDeckRemaining: vi.fn(),
      updateScores: vi.fn(),
      updateCurrentTurnPlayer: vi.fn(),
      updateFlowState: vi.fn(),
      setSelectedHandCard: vi.fn(),
      clearSelectedHandCard: vi.fn(),
      setSelectedTargetCard: vi.fn(),
      clearSelectedTargetCard: vi.fn(),
      setPossibleTargetCards: vi.fn(),
      clearPossibleTargetCards: vi.fn(),
    }

    mockNotificationPort = {
      showSuccess: vi.fn(),
      showError: vi.fn(),
      showWarning: vi.fn(),
      showInfo: vi.fn(),
      showReconnectionMessage: vi.fn(),
      startActionCountdown: vi.fn(),
      stopActionCountdown: vi.fn(),
    }

    mockAnimationPort = {
      playCardAnimation: vi.fn(),
      playDrawCardAnimation: vi.fn(),
      playMatchAnimation: vi.fn(),
      playYakuAnimation: vi.fn(),
      interrupt: vi.fn(),
      clearHiddenCards: vi.fn(),
    }

    // 使用真實的 MatchmakingStatePort（連接 Pinia store）
    matchmakingStatePort = {
      setStatus: (status) => matchmakingState.setStatus(status),
      setSessionToken: (token) => matchmakingState.setSessionToken(token),
      setErrorMessage: (message) => matchmakingState.setErrorMessage(message),
      clearSession: () => matchmakingState.clearSession(),
    }

    // 建立 Use Case
    handleReconnectionUseCase = new HandleReconnectionUseCase(
      mockUIStatePort,
      mockNotificationPort,
      mockAnimationPort,
      matchmakingStatePort
    )
  })

  it('should complete full reconnection flow: GameSnapshotRestore → clear matchmaking → block lobby access → redirect to game', () => {
    // === Step 1: 模擬遊戲中斷線前的狀態 ===
    gameState.gameId = 'game-123'
    gameState.myPlayerId = 'player-1'
    gameState.opponentPlayerId = 'player-2'

    // 模擬使用者在配對時斷線（matchmakingState 殘留）
    matchmakingState.setStatus('finding')
    matchmakingState.setSessionToken('session-token-123')

    expect(matchmakingState.status).toBe('finding')
    expect(matchmakingState.sessionToken).toBe('session-token-123')

    // === Step 2: 收到 GameSnapshotRestore 事件（重連成功） ===
    const snapshot: GameSnapshotRestore = {
      game_id: 'game-123',
      players: [
        { player_id: 'player-1', nickname: 'Player 1' },
        { player_id: 'player-2', nickname: 'Player 2' },
      ],
      ruleset: {
        total_rounds: 2,
        yaku_settings: [],
        special_rules: { teshi_enabled: true, field_kuttsuki_enabled: true },
        total_deck_cards: 48,
      },
      field_cards: ['01-01', '01-02', '01-03', '01-04', '02-01', '02-02', '02-03', '02-04'],
      player_hand: ['03-01', '03-02', '03-03', '03-04', '04-01', '04-02', '04-03', '04-04'],
      opponent_hand_count: 8,
      player_depository: [],
      opponent_depository: [],
      deck_remaining: 32,
      player_score: 0,
      opponent_score: 0,
      player_yaku: [],
      opponent_yaku: [],
      current_turn_player_id: 'player-1',
      dealer_id: 'player-1',
      flow_state: 'AWAITING_HAND_CARD',
      drawn_card: null,
      possible_target_card_ids: [],
      action_timeout_seconds: 30,
    }

    // === Step 3: 執行重連 Use Case ===
    handleReconnectionUseCase.execute(snapshot)

    // === Step 4: 驗證 Use Case 行為 ===

    // 4.1. 驗證動畫已中斷
    expect(mockAnimationPort.interrupt).toHaveBeenCalled()
    expect(mockAnimationPort.clearHiddenCards).toHaveBeenCalled()

    // 4.2. 驗證 matchmakingState 已清除
    expect(matchmakingState.status).toBe('idle')
    expect(matchmakingState.sessionToken).toBeNull()
    expect(matchmakingState.errorMessage).toBeNull()

    // 4.3. 驗證遊戲狀態已恢復
    expect(mockUIStatePort.restoreGameState).toHaveBeenCalledWith(snapshot)

    // 4.4. 驗證顯示重連訊息
    expect(mockNotificationPort.showReconnectionMessage).toHaveBeenCalled()

    // 4.5. 驗證操作倒數已恢復
    expect(mockNotificationPort.startActionCountdown).toHaveBeenCalledWith(30)

    // === Step 5: 使用者嘗試進入大廳（例如手動輸入 URL） ===
    const mockTo: RouteLocationNormalized = {
      path: '/lobby',
      name: 'lobby',
      params: {},
      query: {},
      hash: '',
      fullPath: '/lobby',
      matched: [],
      meta: {},
      redirectedFrom: undefined,
    } as RouteLocationNormalized

    const mockFrom: RouteLocationNormalized = {
      path: '/',
      name: 'home',
      params: {},
      query: {},
      hash: '',
      fullPath: '/',
      matched: [],
      meta: {},
      redirectedFrom: undefined,
    } as RouteLocationNormalized

    const mockNext: NavigationGuardNext = vi.fn()

    // === Step 6: lobbyPageGuard 應攔截並重定向至 /game ===
    lobbyPageGuard(mockTo, mockFrom, mockNext)

    expect(mockNext).toHaveBeenCalledWith({ name: 'game' })
    expect(mockNext).toHaveBeenCalledTimes(1)
  })

  it('should allow entering lobby after game session is cleared (user left game)', () => {
    // === Step 1: 模擬遊戲進行中 ===
    gameState.gameId = 'game-456'
    gameState.myPlayerId = 'player-1'
    gameState.opponentPlayerId = 'player-2'

    // === Step 2: 使用者主動離開遊戲，清除遊戲狀態 ===
    gameState.$reset()

    expect(gameState.gameId).toBeNull()

    // === Step 3: 使用者嘗試進入大廳 ===
    const mockTo: RouteLocationNormalized = {
      path: '/lobby',
      name: 'lobby',
      params: {},
      query: {},
      hash: '',
      fullPath: '/lobby',
      matched: [],
      meta: {},
      redirectedFrom: undefined,
    } as RouteLocationNormalized

    const mockFrom: RouteLocationNormalized = {
      path: '/game',
      name: 'game',
      params: {},
      query: {},
      hash: '',
      fullPath: '/game',
      matched: [],
      meta: {},
      redirectedFrom: undefined,
    } as RouteLocationNormalized

    const mockNext: NavigationGuardNext = vi.fn()

    // === Step 4: lobbyPageGuard 應允許進入大廳 ===
    lobbyPageGuard(mockTo, mockFrom, mockNext)

    expect(mockNext).toHaveBeenCalledWith()
    expect(mockNext).toHaveBeenCalledTimes(1)
  })

  it('should handle multiple reconnection attempts gracefully', () => {
    // === Step 1: 第一次重連 ===
    const snapshot1: GameSnapshotRestore = {
      game_id: 'game-789',
      players: [
        { player_id: 'player-1', nickname: 'Player 1' },
        { player_id: 'player-2', nickname: 'Player 2' },
      ],
      ruleset: {
        total_rounds: 2,
        yaku_settings: [],
        special_rules: { teshi_enabled: true, field_kuttsuki_enabled: true },
        total_deck_cards: 48,
      },
      field_cards: [],
      player_hand: [],
      opponent_hand_count: 0,
      player_depository: [],
      opponent_depository: [],
      deck_remaining: 48,
      player_score: 0,
      opponent_score: 0,
      player_yaku: [],
      opponent_yaku: [],
      current_turn_player_id: 'player-1',
      dealer_id: 'player-1',
      flow_state: 'AWAITING_HAND_CARD',
      drawn_card: null,
      possible_target_card_ids: [],
      action_timeout_seconds: 30,
    }

    // 模擬配對狀態殘留
    matchmakingState.setStatus('finding')
    matchmakingState.setSessionToken('old-session')

    handleReconnectionUseCase.execute(snapshot1)

    expect(matchmakingState.status).toBe('idle')
    expect(matchmakingState.sessionToken).toBeNull()

    // === Step 2: 第二次重連（例如連線不穩定） ===
    // 再次設置配對狀態（模擬使用者嘗試重新配對）
    matchmakingState.setStatus('error')
    matchmakingState.setErrorMessage('Connection lost')

    const snapshot2: GameSnapshotRestore = {
      ...snapshot1,
      game_id: 'game-789',
      action_timeout_seconds: 25,
    }

    handleReconnectionUseCase.execute(snapshot2)

    // === Step 3: 驗證 matchmakingState 再次清除 ===
    expect(matchmakingState.status).toBe('idle')
    expect(matchmakingState.sessionToken).toBeNull()
    expect(matchmakingState.errorMessage).toBeNull()

    // === Step 4: 驗證 Use Case 正確執行 ===
    expect(mockUIStatePort.restoreGameState).toHaveBeenCalledTimes(2)
    expect(mockNotificationPort.showReconnectionMessage).toHaveBeenCalledTimes(2)
  })
})
