/**
 * HandleGameErrorUseCase Unit Tests
 *
 * @description
 * 測試 HandleGameErrorUseCase 的錯誤處理邏輯
 * 測試覆蓋率目標: > 80%
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { HandleGameErrorUseCase } from '../../../src/user-interface/application/use-cases/event-handlers/HandleGameErrorUseCase'
import type {
  NotificationPort,
  MatchmakingStatePort,
  NavigationPort,
} from '../../../src/user-interface/application/ports/output'
import type { GameErrorEvent } from '../../../src/user-interface/application/types'

describe('HandleGameErrorUseCase', () => {
  let notificationPort: NotificationPort
  let matchmakingStatePort: MatchmakingStatePort
  let navigationPort: NavigationPort
  let useCase: HandleGameErrorUseCase

  beforeEach(() => {
    // Mock NotificationPort
    notificationPort = {
      showErrorMessage: vi.fn(),
      showSuccessMessage: vi.fn(),
      showReconnectionMessage: vi.fn(),
      showDecisionModal: vi.fn(),
      showGameFinishedModal: vi.fn(),
      showRoundDrawnModal: vi.fn(),
      showRoundScoredModal: vi.fn(),
      showRoundEndedInstantlyModal: vi.fn(),
      hideModal: vi.fn(),
      isModalVisible: vi.fn(),
      startActionCountdown: vi.fn(),
      stopActionCountdown: vi.fn(),
      startDisplayCountdown: vi.fn(),
      stopDisplayCountdown: vi.fn(),
      cleanup: vi.fn(),
    }

    // Mock MatchmakingStatePort
    matchmakingStatePort = {
      setStatus: vi.fn(),
      setSessionToken: vi.fn(),
      setErrorMessage: vi.fn(),
      clearSession: vi.fn(),
    }

    // Mock NavigationPort
    navigationPort = {
      navigateToLobby: vi.fn(),
      navigateToGame: vi.fn(),
      navigateToHome: vi.fn(),
    }

    // 創建 UseCase 實例
    useCase = new HandleGameErrorUseCase(
      notificationPort,
      matchmakingStatePort,
      navigationPort
    )
  })

  describe('基本錯誤處理', () => {
    it('應該顯示錯誤通知', () => {
      const event: GameErrorEvent = {
        event_type: 'GameError',
        event_id: 'error-1',
        timestamp: '2025-01-01T00:00:00Z',
        error_code: 'MATCHMAKING_TIMEOUT',
        message: '配對超時，請重試',
        recoverable: true,
        suggested_action: 'RETRY_MATCHMAKING',
      }

      useCase.execute(event)

      expect(notificationPort.showErrorMessage).toHaveBeenCalledWith('配對超時，請重試')
      expect(notificationPort.showErrorMessage).toHaveBeenCalledTimes(1)
    })

    it('應該設定配對狀態為錯誤', () => {
      const event: GameErrorEvent = {
        event_type: 'GameError',
        event_id: 'error-2',
        timestamp: '2025-01-01T00:00:00Z',
        error_code: 'GAME_EXPIRED',
        message: '遊戲已過期',
        recoverable: true,
      }

      useCase.execute(event)

      expect(matchmakingStatePort.setStatus).toHaveBeenCalledWith('error')
      expect(matchmakingStatePort.setStatus).toHaveBeenCalledTimes(1)
    })

    it('應該設定錯誤訊息', () => {
      const event: GameErrorEvent = {
        event_type: 'GameError',
        event_id: 'error-3',
        timestamp: '2025-01-01T00:00:00Z',
        error_code: 'SESSION_INVALID',
        message: '會話無效',
        recoverable: true,
      }

      useCase.execute(event)

      expect(matchmakingStatePort.setErrorMessage).toHaveBeenCalledWith('會話無效')
      expect(matchmakingStatePort.setErrorMessage).toHaveBeenCalledTimes(1)
    })
  })

  describe('不可恢復的錯誤', () => {
    it('應該清除會話並導航到首頁', () => {
      const event: GameErrorEvent = {
        event_type: 'GameError',
        event_id: 'error-4',
        timestamp: '2025-01-01T00:00:00Z',
        error_code: 'SESSION_INVALID',
        message: '會話已失效，請重新開始',
        recoverable: false,
      }

      useCase.execute(event)

      expect(matchmakingStatePort.clearSession).toHaveBeenCalledTimes(1)
      expect(navigationPort.navigateToHome).toHaveBeenCalledTimes(1)
    })

    it('不可恢復的錯誤應該忽略 suggested_action', () => {
      const event: GameErrorEvent = {
        event_type: 'GameError',
        event_id: 'error-5',
        timestamp: '2025-01-01T00:00:00Z',
        error_code: 'GAME_EXPIRED',
        message: '遊戲過期',
        recoverable: false,
        suggested_action: 'RETRY_MATCHMAKING', // 這個應該被忽略
      }

      useCase.execute(event)

      // 應該執行不可恢復的錯誤處理
      expect(matchmakingStatePort.clearSession).toHaveBeenCalledTimes(1)
      expect(navigationPort.navigateToHome).toHaveBeenCalledTimes(1)
    })

    it('不可恢復的錯誤應該在導航前清除會話', () => {
      const event: GameErrorEvent = {
        event_type: 'GameError',
        event_id: 'error-6',
        timestamp: '2025-01-01T00:00:00Z',
        error_code: 'SESSION_INVALID',
        message: '嚴重錯誤',
        recoverable: false,
      }

      const callOrder: string[] = []

      matchmakingStatePort.clearSession = vi.fn(() => {
        callOrder.push('clearSession')
      })
      navigationPort.navigateToHome = vi.fn(() => {
        callOrder.push('navigateToHome')
      })

      useCase.execute(event)

      expect(callOrder).toEqual(['clearSession', 'navigateToHome'])
    })
  })

  describe('可恢復的錯誤 - RETURN_HOME', () => {
    it('suggested_action 為 RETURN_HOME 時應該清除會話並導航到首頁', () => {
      const event: GameErrorEvent = {
        event_type: 'GameError',
        event_id: 'error-7',
        timestamp: '2025-01-01T00:00:00Z',
        error_code: 'OPPONENT_DISCONNECTED',
        message: '對手已離線',
        recoverable: true,
        suggested_action: 'RETURN_HOME',
      }

      useCase.execute(event)

      expect(matchmakingStatePort.clearSession).toHaveBeenCalledTimes(1)
      expect(navigationPort.navigateToHome).toHaveBeenCalledTimes(1)
    })
  })

  describe('可恢復的錯誤 - RETRY_MATCHMAKING', () => {
    it('suggested_action 為 RETRY_MATCHMAKING 時不應該導航', () => {
      const event: GameErrorEvent = {
        event_type: 'GameError',
        event_id: 'error-8',
        timestamp: '2025-01-01T00:00:00Z',
        error_code: 'MATCHMAKING_TIMEOUT',
        message: '配對超時，請重試',
        recoverable: true,
        suggested_action: 'RETRY_MATCHMAKING',
      }

      useCase.execute(event)

      // 應該只設定錯誤狀態，不清除會話或導航
      expect(notificationPort.showErrorMessage).toHaveBeenCalledWith('配對超時，請重試')
      expect(matchmakingStatePort.setStatus).toHaveBeenCalledWith('error')
      expect(matchmakingStatePort.setErrorMessage).toHaveBeenCalledWith('配對超時，請重試')
      expect(matchmakingStatePort.clearSession).not.toHaveBeenCalled()
      expect(navigationPort.navigateToHome).not.toHaveBeenCalled()
    })
  })

  describe('可恢復的錯誤 - 無 suggested_action', () => {
    it('沒有 suggested_action 時不應該導航', () => {
      const event: GameErrorEvent = {
        event_type: 'GameError',
        event_id: 'error-9',
        timestamp: '2025-01-01T00:00:00Z',
        error_code: 'GAME_EXPIRED',
        message: '遊戲已過期',
        recoverable: true,
        // 沒有 suggested_action
      }

      useCase.execute(event)

      // 應該只設定錯誤狀態，不導航
      expect(notificationPort.showErrorMessage).toHaveBeenCalledWith('遊戲已過期')
      expect(matchmakingStatePort.setStatus).toHaveBeenCalledWith('error')
      expect(matchmakingStatePort.setErrorMessage).toHaveBeenCalledWith('遊戲已過期')
      expect(matchmakingStatePort.clearSession).not.toHaveBeenCalled()
      expect(navigationPort.navigateToHome).not.toHaveBeenCalled()
    })
  })

  describe('可恢復的錯誤 - RECONNECT', () => {
    it('suggested_action 為 RECONNECT 時不應該導航', () => {
      const event: GameErrorEvent = {
        event_type: 'GameError',
        event_id: 'error-10',
        timestamp: '2025-01-01T00:00:00Z',
        error_code: 'SESSION_INVALID',
        message: '連線中斷，嘗試重連',
        recoverable: true,
        suggested_action: 'RECONNECT',
      }

      useCase.execute(event)

      // 應該只設定錯誤狀態，不清除會話或導航
      expect(notificationPort.showErrorMessage).toHaveBeenCalledWith('連線中斷，嘗試重連')
      expect(matchmakingStatePort.setStatus).toHaveBeenCalledWith('error')
      expect(matchmakingStatePort.setErrorMessage).toHaveBeenCalledWith('連線中斷，嘗試重連')
      expect(matchmakingStatePort.clearSession).not.toHaveBeenCalled()
      expect(navigationPort.navigateToHome).not.toHaveBeenCalled()
    })
  })

  describe('完整流程測試', () => {
    it('應該按正確順序處理配對超時錯誤', () => {
      const callOrder: string[] = []

      notificationPort.showErrorMessage = vi.fn(() => {
        callOrder.push('showErrorMessage')
      })
      matchmakingStatePort.setStatus = vi.fn(() => {
        callOrder.push('setStatus')
      })
      matchmakingStatePort.setErrorMessage = vi.fn(() => {
        callOrder.push('setErrorMessage')
      })

      const event: GameErrorEvent = {
        event_type: 'GameError',
        event_id: 'error-11',
        timestamp: '2025-01-01T00:00:00Z',
        error_code: 'MATCHMAKING_TIMEOUT',
        message: '配對超時',
        recoverable: true,
        suggested_action: 'RETRY_MATCHMAKING',
      }

      useCase.execute(event)

      expect(callOrder).toEqual(['showErrorMessage', 'setStatus', 'setErrorMessage'])
    })

    it('應該按正確順序處理致命錯誤', () => {
      const callOrder: string[] = []

      notificationPort.showErrorMessage = vi.fn(() => {
        callOrder.push('showErrorMessage')
      })
      matchmakingStatePort.setStatus = vi.fn(() => {
        callOrder.push('setStatus')
      })
      matchmakingStatePort.setErrorMessage = vi.fn(() => {
        callOrder.push('setErrorMessage')
      })
      matchmakingStatePort.clearSession = vi.fn(() => {
        callOrder.push('clearSession')
      })
      navigationPort.navigateToHome = vi.fn(() => {
        callOrder.push('navigateToHome')
      })

      const event: GameErrorEvent = {
        event_type: 'GameError',
        event_id: 'error-12',
        timestamp: '2025-01-01T00:00:00Z',
        error_code: 'SESSION_INVALID',
        message: '致命錯誤',
        recoverable: false,
      }

      useCase.execute(event)

      expect(callOrder).toEqual([
        'showErrorMessage',
        'setStatus',
        'setErrorMessage',
        'clearSession',
        'navigateToHome',
      ])
    })
  })

  describe('各種錯誤碼測試', () => {
    const errorCodes: Array<GameErrorEvent['error_code']> = [
      'MATCHMAKING_TIMEOUT',
      'GAME_EXPIRED',
      'SESSION_INVALID',
      'OPPONENT_DISCONNECTED',
    ]

    errorCodes.forEach((errorCode) => {
      it(`應該正確處理 ${errorCode} 錯誤`, () => {
        const event: GameErrorEvent = {
          event_type: 'GameError',
          event_id: `error-${errorCode}`,
          timestamp: '2025-01-01T00:00:00Z',
          error_code: errorCode,
          message: `錯誤: ${errorCode}`,
          recoverable: true,
        }

        useCase.execute(event)

        expect(notificationPort.showErrorMessage).toHaveBeenCalledWith(`錯誤: ${errorCode}`)
        expect(matchmakingStatePort.setStatus).toHaveBeenCalledWith('error')
        expect(matchmakingStatePort.setErrorMessage).toHaveBeenCalledWith(`錯誤: ${errorCode}`)
      })
    })
  })
})
