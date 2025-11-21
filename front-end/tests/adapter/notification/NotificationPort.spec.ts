/**
 * NotificationPort 單元測試
 *
 * T018 [US2] - 測試 NotificationPort 介面定義
 *
 * 測試重點：
 * 1. Port 介面符合 data-model.md 定義
 * 2. 所有通知方法皆可呼叫
 * 3. Modal 相關方法正確定義
 */

import { describe, it, expect, vi } from 'vitest'

import type { NotificationPort } from '@/user-interface/application/ports/output/notification.port'

describe('NotificationPort Interface', () => {
  describe('Selection UI Methods', () => {
    it('should define showSelectionUI method', () => {
      const mockPort: NotificationPort = {
        showSelectionUI: vi.fn(),
        showDecisionModal: vi.fn(),
        showGameFinishedUI: vi.fn(),
        showRoundDrawnUI: vi.fn(),
        hideModal: vi.fn(),
        showErrorMessage: vi.fn(),
        showSuccessMessage: vi.fn(),
        showReconnectionMessage: vi.fn(),
        isModalVisible: vi.fn().mockReturnValue(false),
      }

      expect(mockPort.showSelectionUI).toBeDefined()
      expect(typeof mockPort.showSelectionUI).toBe('function')
    })

    it('showSelectionUI should accept string array', () => {
      const mockPort: NotificationPort = {
        showSelectionUI: vi.fn(),
        showDecisionModal: vi.fn(),
        showGameFinishedUI: vi.fn(),
        showRoundDrawnUI: vi.fn(),
        hideModal: vi.fn(),
        showErrorMessage: vi.fn(),
        showSuccessMessage: vi.fn(),
        showReconnectionMessage: vi.fn(),
        isModalVisible: vi.fn().mockReturnValue(false),
      }

      mockPort.showSelectionUI(['0101', '0102', '0103'])

      expect(mockPort.showSelectionUI).toHaveBeenCalledWith(['0101', '0102', '0103'])
    })

    it('should define hideModal method', () => {
      const mockPort: NotificationPort = {
        showSelectionUI: vi.fn(),
        showDecisionModal: vi.fn(),
        showGameFinishedUI: vi.fn(),
        showRoundDrawnUI: vi.fn(),
        hideModal: vi.fn(),
        showErrorMessage: vi.fn(),
        showSuccessMessage: vi.fn(),
        showReconnectionMessage: vi.fn(),
        isModalVisible: vi.fn().mockReturnValue(false),
      }

      expect(mockPort.hideModal).toBeDefined()
      expect(() => mockPort.hideModal()).not.toThrow()
    })
  })

  describe('Modal Methods', () => {
    it('should define showDecisionModal method', () => {
      const mockPort: NotificationPort = {
        showSelectionUI: vi.fn(),
        showDecisionModal: vi.fn(),
        showGameFinishedUI: vi.fn(),
        showRoundDrawnUI: vi.fn(),
        hideModal: vi.fn(),
        showErrorMessage: vi.fn(),
        showSuccessMessage: vi.fn(),
        showReconnectionMessage: vi.fn(),
        isModalVisible: vi.fn().mockReturnValue(false),
      }

      expect(mockPort.showDecisionModal).toBeDefined()
      expect(typeof mockPort.showDecisionModal).toBe('function')
    })

    it('showDecisionModal should accept yaku and score params', () => {
      const mockPort: NotificationPort = {
        showSelectionUI: vi.fn(),
        showDecisionModal: vi.fn(),
        showGameFinishedUI: vi.fn(),
        showRoundDrawnUI: vi.fn(),
        hideModal: vi.fn(),
        showErrorMessage: vi.fn(),
        showSuccessMessage: vi.fn(),
        showReconnectionMessage: vi.fn(),
        isModalVisible: vi.fn().mockReturnValue(false),
      }

      const yakuList = [{ yaku_type: 'INOU_SHIKO', base_points: 5 }]
      mockPort.showDecisionModal(yakuList, 5)

      expect(mockPort.showDecisionModal).toHaveBeenCalledWith(yakuList, 5)
    })

    it('should define showGameFinishedUI method', () => {
      const mockPort: NotificationPort = {
        showSelectionUI: vi.fn(),
        showDecisionModal: vi.fn(),
        showGameFinishedUI: vi.fn(),
        showRoundDrawnUI: vi.fn(),
        hideModal: vi.fn(),
        showErrorMessage: vi.fn(),
        showSuccessMessage: vi.fn(),
        showReconnectionMessage: vi.fn(),
        isModalVisible: vi.fn().mockReturnValue(false),
      }

      expect(mockPort.showGameFinishedUI).toBeDefined()
    })

    it('showGameFinishedUI should accept winnerId, scores, and isPlayerWinner', () => {
      const mockPort: NotificationPort = {
        showSelectionUI: vi.fn(),
        showDecisionModal: vi.fn(),
        showGameFinishedUI: vi.fn(),
        showRoundDrawnUI: vi.fn(),
        hideModal: vi.fn(),
        showErrorMessage: vi.fn(),
        showSuccessMessage: vi.fn(),
        showReconnectionMessage: vi.fn(),
        isModalVisible: vi.fn().mockReturnValue(false),
      }

      const scores = [
        { player_id: 'p1', score: 50 },
        { player_id: 'p2', score: 30 },
      ]
      mockPort.showGameFinishedUI('p1', scores, true)

      expect(mockPort.showGameFinishedUI).toHaveBeenCalledWith('p1', scores, true)
    })

    it('should define showRoundDrawnUI method', () => {
      const mockPort: NotificationPort = {
        showSelectionUI: vi.fn(),
        showDecisionModal: vi.fn(),
        showGameFinishedUI: vi.fn(),
        showRoundDrawnUI: vi.fn(),
        hideModal: vi.fn(),
        showErrorMessage: vi.fn(),
        showSuccessMessage: vi.fn(),
        showReconnectionMessage: vi.fn(),
        isModalVisible: vi.fn().mockReturnValue(false),
      }

      expect(mockPort.showRoundDrawnUI).toBeDefined()
    })

    it('showRoundDrawnUI should accept scores array', () => {
      const mockPort: NotificationPort = {
        showSelectionUI: vi.fn(),
        showDecisionModal: vi.fn(),
        showGameFinishedUI: vi.fn(),
        showRoundDrawnUI: vi.fn(),
        hideModal: vi.fn(),
        showErrorMessage: vi.fn(),
        showSuccessMessage: vi.fn(),
        showReconnectionMessage: vi.fn(),
        isModalVisible: vi.fn().mockReturnValue(false),
      }

      const scores = [
        { player_id: 'p1', score: 25 },
        { player_id: 'p2', score: 25 },
      ]
      mockPort.showRoundDrawnUI(scores)

      expect(mockPort.showRoundDrawnUI).toHaveBeenCalledWith(scores)
    })
  })

  describe('Toast Methods', () => {
    it('should define showErrorMessage method', () => {
      const mockPort: NotificationPort = {
        showSelectionUI: vi.fn(),
        showDecisionModal: vi.fn(),
        showGameFinishedUI: vi.fn(),
        showRoundDrawnUI: vi.fn(),
        hideModal: vi.fn(),
        showErrorMessage: vi.fn(),
        showSuccessMessage: vi.fn(),
        showReconnectionMessage: vi.fn(),
        isModalVisible: vi.fn().mockReturnValue(false),
      }

      expect(mockPort.showErrorMessage).toBeDefined()
    })

    it('showErrorMessage should accept string message', () => {
      const mockPort: NotificationPort = {
        showSelectionUI: vi.fn(),
        showDecisionModal: vi.fn(),
        showGameFinishedUI: vi.fn(),
        showRoundDrawnUI: vi.fn(),
        hideModal: vi.fn(),
        showErrorMessage: vi.fn(),
        showSuccessMessage: vi.fn(),
        showReconnectionMessage: vi.fn(),
        isModalVisible: vi.fn().mockReturnValue(false),
      }

      mockPort.showErrorMessage('Invalid move')

      expect(mockPort.showErrorMessage).toHaveBeenCalledWith('Invalid move')
    })

    it('should define showSuccessMessage method', () => {
      const mockPort: NotificationPort = {
        showSelectionUI: vi.fn(),
        showDecisionModal: vi.fn(),
        showGameFinishedUI: vi.fn(),
        showRoundDrawnUI: vi.fn(),
        hideModal: vi.fn(),
        showErrorMessage: vi.fn(),
        showSuccessMessage: vi.fn(),
        showReconnectionMessage: vi.fn(),
        isModalVisible: vi.fn().mockReturnValue(false),
      }

      expect(mockPort.showSuccessMessage).toBeDefined()
    })

    it('should define showReconnectionMessage method', () => {
      const mockPort: NotificationPort = {
        showSelectionUI: vi.fn(),
        showDecisionModal: vi.fn(),
        showGameFinishedUI: vi.fn(),
        showRoundDrawnUI: vi.fn(),
        hideModal: vi.fn(),
        showErrorMessage: vi.fn(),
        showSuccessMessage: vi.fn(),
        showReconnectionMessage: vi.fn(),
        isModalVisible: vi.fn().mockReturnValue(false),
      }

      expect(mockPort.showReconnectionMessage).toBeDefined()
      expect(() => mockPort.showReconnectionMessage()).not.toThrow()
    })
  })

  describe('Query Methods', () => {
    it('should define isModalVisible method', () => {
      const mockPort: NotificationPort = {
        showSelectionUI: vi.fn(),
        showDecisionModal: vi.fn(),
        showGameFinishedUI: vi.fn(),
        showRoundDrawnUI: vi.fn(),
        hideModal: vi.fn(),
        showErrorMessage: vi.fn(),
        showSuccessMessage: vi.fn(),
        showReconnectionMessage: vi.fn(),
        isModalVisible: vi.fn().mockReturnValue(false),
      }

      expect(mockPort.isModalVisible).toBeDefined()
      expect(typeof mockPort.isModalVisible).toBe('function')
    })

    it('isModalVisible should return boolean', () => {
      const mockPort: NotificationPort = {
        showSelectionUI: vi.fn(),
        hideSelectionUI: vi.fn(),
        showDecisionModal: vi.fn(),
        showGameFinishedUI: vi.fn(),
        showRoundDrawnUI: vi.fn(),
        showErrorMessage: vi.fn(),
        showSuccessMessage: vi.fn(),
        showReconnectionMessage: vi.fn(),
        isModalVisible: vi.fn().mockReturnValue(true),
      }

      const result = mockPort.isModalVisible()

      expect(typeof result).toBe('boolean')
      expect(result).toBe(true)
    })
  })
})
