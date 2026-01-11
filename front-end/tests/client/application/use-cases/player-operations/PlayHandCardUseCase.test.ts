/**
 * PlayHandCardUseCase 測試
 *
 * @description
 * 測試玩家打牌 Use Case 的業務流程編排邏輯：
 * - 預驗證（卡片是否在手牌中）
 * - 配對檢查（無配對/單一配對/多重配對）
 * - 觸發選擇 UI 或發送命令
 *
 * 測試策略：Mock Domain Facade 和 Output Ports，驗證業務流程編排
 *
 * 覆蓋率目標：> 90%（業務編排邏輯）
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PlayHandCardUseCase } from '@/game-client/application/use-cases/player-operations/PlayHandCardUseCase'
import {
  createMockSendCommandPort,
  createMockNotificationPort,
  createMockDomainFacade,
  createMockAnimationPort,
  createMockErrorHandlerPort,
} from '../../test-helpers/mock-factories'
import type { Card } from '@/game-client/domain'

describe('PlayHandCardUseCase', () => {
  // Test fixtures
  const mockFieldCard1: Card = {
    card_id: '0142',
    month: 1,
    type: 'PLAIN',
    display_name: '松かす2',
  }

  const mockFieldCard2: Card = {
    card_id: '0143',
    month: 1,
    type: 'PLAIN',
    display_name: '松かす3',
  }

  // Test helpers
  let mockSendCommandPort: ReturnType<typeof createMockSendCommandPort>
  let mockNotificationPort: ReturnType<typeof createMockNotificationPort>
  let mockDomainFacade: ReturnType<typeof createMockDomainFacade>
  let mockAnimationPort: ReturnType<typeof createMockAnimationPort>
  let mockErrorHandler: ReturnType<typeof createMockErrorHandlerPort>

  beforeEach(() => {
    mockSendCommandPort = createMockSendCommandPort()
    mockNotificationPort = createMockNotificationPort()
    mockDomainFacade = createMockDomainFacade()
    mockAnimationPort = createMockAnimationPort()
    mockErrorHandler = createMockErrorHandlerPort()
  })

  describe('Pre-validation (卡片存在性驗證)', () => {
    it('should return error when card is not in hand', () => {
      // Arrange
      mockDomainFacade.validateCardExists = vi.fn().mockReturnValue(false)

      const useCase = new PlayHandCardUseCase(
        mockSendCommandPort,
        mockNotificationPort,
        mockDomainFacade,
        mockAnimationPort,
        mockErrorHandler
      )

      // Act
      const result = useCase.execute({
        cardId: '0141',
        handCards: ['0241', '0242'],
        fieldCards: ['0142', '0143'],
      })

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('CARD_NOT_IN_HAND')
      }
      expect(mockDomainFacade.validateCardExists).toHaveBeenCalled()
      expect(mockSendCommandPort.playHandCard).not.toHaveBeenCalled()
    })

    it('should proceed when card is in hand', () => {
      // Arrange
      mockDomainFacade.validateCardExists = vi.fn().mockReturnValue(true)
      mockDomainFacade.findMatchableCards = vi.fn().mockReturnValue([])

      const useCase = new PlayHandCardUseCase(
        mockSendCommandPort,
        mockNotificationPort,
        mockDomainFacade,
        mockAnimationPort,
        mockErrorHandler
      )

      // Act
      const result = useCase.execute({
        cardId: '0141',
        handCards: ['0141', '0242'],
        fieldCards: [],
      })

      // Assert
      expect(result.success).toBe(true)
      expect(mockDomainFacade.validateCardExists).toHaveBeenCalled()
    })
  })

  describe('No match scenario (無配對場景)', () => {
    it('should send command with no target when no matchable cards found', async () => {
      // Arrange
      mockDomainFacade.validateCardExists = vi.fn().mockReturnValue(true)
      mockDomainFacade.findMatchableCards = vi.fn().mockReturnValue([])

      const useCase = new PlayHandCardUseCase(
        mockSendCommandPort,
        mockNotificationPort,
        mockDomainFacade,
        mockAnimationPort,
        mockErrorHandler
      )

      // Act
      const result = useCase.execute({
        cardId: '0141',
        handCards: ['0141'],
        fieldCards: ['0241', '0242'], // 不同月份
      })

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.value.needSelection).toBe(false)
        expect(result.value.selectedTarget).toBe(null)
        expect(result.value.possibleTargets).toBeUndefined()
      }

      expect(mockDomainFacade.findMatchableCards).toHaveBeenCalled()
      expect(mockSendCommandPort.playHandCard).toHaveBeenCalledWith('0141', undefined)
    })
  })

  describe('Single match scenario (單一配對場景)', () => {
    it('should send command with target when single matchable card found', async () => {
      // Arrange
      mockDomainFacade.validateCardExists = vi.fn().mockReturnValue(true)
      mockDomainFacade.findMatchableCards = vi.fn().mockReturnValue([mockFieldCard1])

      const useCase = new PlayHandCardUseCase(
        mockSendCommandPort,
        mockNotificationPort,
        mockDomainFacade,
        mockAnimationPort,
        mockErrorHandler
      )

      // Act
      const result = useCase.execute({
        cardId: '0141',
        handCards: ['0141'],
        fieldCards: ['0142', '0241'], // 一張同月、一張不同月
      })

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.value.needSelection).toBe(false)
        expect(result.value.selectedTarget).toBe('0142')
        expect(result.value.possibleTargets).toBeUndefined()
      }

      expect(mockDomainFacade.findMatchableCards).toHaveBeenCalled()
      expect(mockSendCommandPort.playHandCard).toHaveBeenCalledWith('0141', '0142')
    })
  })

  describe('Multiple match scenario (多重配對場景)', () => {
    it('should return error for double match requiring UI selection', () => {
      // Arrange
      mockDomainFacade.validateCardExists = vi.fn().mockReturnValue(true)
      mockDomainFacade.findMatchableCards = vi
        .fn()
        .mockReturnValue([mockFieldCard1, mockFieldCard2])

      const useCase = new PlayHandCardUseCase(
        mockSendCommandPort,
        mockNotificationPort,
        mockDomainFacade,
        mockAnimationPort,
        mockErrorHandler
      )

      // Act
      const result = useCase.execute({
        cardId: '0141',
        handCards: ['0141'],
        fieldCards: ['0142', '0143', '0241'], // 兩張同月、一張不同月
      })

      // Assert: 雙重配對時，Use Case 預期 UI 層已處理並傳入 targetCardId
      // 若未傳入，則返回錯誤要求 UI 層進行選擇
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('DOUBLE_MATCH_REQUIRES_TARGET')
      }

      expect(mockDomainFacade.findMatchableCards).toHaveBeenCalled()
      expect(mockSendCommandPort.playHandCard).not.toHaveBeenCalled()
    })

    it('should handle double match with targetCardId provided', () => {
      // Arrange
      mockDomainFacade.validateCardExists = vi.fn().mockReturnValue(true)
      mockDomainFacade.findMatchableCards = vi
        .fn()
        .mockReturnValue([mockFieldCard1, mockFieldCard2])

      const useCase = new PlayHandCardUseCase(
        mockSendCommandPort,
        mockNotificationPort,
        mockDomainFacade,
        mockAnimationPort,
        mockErrorHandler
      )

      // Act: UI 層傳入 targetCardId 確認選擇
      const result = useCase.execute({
        cardId: '0141',
        handCards: ['0141'],
        fieldCards: ['0142', '0143', '0241'],
        targetCardId: '0142', // 使用者選擇的目標
      })

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.value.needSelection).toBe(false)
        expect(result.value.selectedTarget).toBe('0142')
      }

      expect(mockSendCommandPort.playHandCard).toHaveBeenCalledWith('0141', '0142')
    })

    it('should auto-capture all cards for triple match (TRIPLE_MATCH)', () => {
      // Arrange
      const mockFieldCard3: Card = {
        card_id: '0144',
        month: 1,
        type: 'PLAIN',
        display_name: '松かす4',
      }

      mockDomainFacade.validateCardExists = vi.fn().mockReturnValue(true)
      mockDomainFacade.findMatchableCards = vi
        .fn()
        .mockReturnValue([mockFieldCard1, mockFieldCard2, mockFieldCard3])

      const useCase = new PlayHandCardUseCase(
        mockSendCommandPort,
        mockNotificationPort,
        mockDomainFacade,
        mockAnimationPort,
        mockErrorHandler
      )

      // Act
      const result = useCase.execute({
        cardId: '0141',
        handCards: ['0141'],
        fieldCards: ['0142', '0143', '0144'],
      })

      // Assert: 三重配對時，直接配對所有牌（無需選擇）
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.value.needSelection).toBe(false)
        expect(result.value.selectedTarget).toBe(null) // TRIPLE_MATCH 不需要指定 target
      }

      // 三重配對應該發送命令（不帶 target，由後端處理）
      expect(mockSendCommandPort.playHandCard).toHaveBeenCalledWith('0141', undefined)
    })
  })

  describe('Edge cases (邊界情況)', () => {
    it('should handle empty hand cards', () => {
      // Arrange
      mockDomainFacade.validateCardExists = vi.fn().mockReturnValue(false)

      const useCase = new PlayHandCardUseCase(
        mockSendCommandPort,
        mockNotificationPort,
        mockDomainFacade,
        mockAnimationPort,
        mockErrorHandler
      )

      // Act
      const result = useCase.execute({
        cardId: '0141',
        handCards: [],
        fieldCards: ['0142'],
      })

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('CARD_NOT_IN_HAND')
      }
    })

    it('should handle empty field cards', () => {
      // Arrange
      mockDomainFacade.validateCardExists = vi.fn().mockReturnValue(true)
      mockDomainFacade.findMatchableCards = vi.fn().mockReturnValue([])

      const useCase = new PlayHandCardUseCase(
        mockSendCommandPort,
        mockNotificationPort,
        mockDomainFacade,
        mockAnimationPort,
        mockErrorHandler
      )

      // Act
      const result = useCase.execute({
        cardId: '0141',
        handCards: ['0141'],
        fieldCards: [],
      })

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.value.needSelection).toBe(false)
        expect(result.value.selectedTarget).toBe(null)
      }

      expect(mockSendCommandPort.playHandCard).toHaveBeenCalledWith('0141', undefined)
    })
  })

  describe('Integration with dependencies (依賴整合)', () => {
    it('should call domain facade with correct Card objects', () => {
      // Arrange
      const handCards = ['0141', '0242']
      const fieldCards = ['0142', '0143', '0241']

      mockDomainFacade.validateCardExists = vi.fn().mockReturnValue(true)
      mockDomainFacade.findMatchableCards = vi.fn().mockReturnValue([])

      const useCase = new PlayHandCardUseCase(
        mockSendCommandPort,
        mockNotificationPort,
        mockDomainFacade,
        mockAnimationPort,
        mockErrorHandler
      )

      // Act
      useCase.execute({
        cardId: '0141',
        handCards,
        fieldCards,
      })

      // Assert
      // Domain facade should be called with Card objects, not strings
      expect(mockDomainFacade.validateCardExists).toHaveBeenCalled()
      expect(mockDomainFacade.findMatchableCards).toHaveBeenCalled()

      // Note: The actual Card conversion logic will be in the Use Case implementation
      // This test verifies that the domain facade methods are called
    })
  })
})
