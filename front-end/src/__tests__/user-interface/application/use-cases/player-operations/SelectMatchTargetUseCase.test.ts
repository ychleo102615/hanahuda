/**
 * SelectMatchTargetUseCase 測試
 *
 * @description
 * 測試選擇配對目標 Use Case 的業務流程編排邏輯：
 * - 驗證目標卡片是否在可選目標列表中
 * - 發送 TurnSelectTarget 命令
 *
 * 測試策略：Mock Domain Facade 和 Output Ports，驗證業務流程編排
 *
 * 覆蓋率目標：> 90%（業務編排邏輯）
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SelectMatchTargetUseCase } from '@/user-interface/application/use-cases/player-operations/SelectMatchTargetUseCase'
import {
  createMockSendCommandPort,
  createMockDomainFacade,
} from '../../test-helpers/mock-factories'
import type { Card } from '@/user-interface/domain'

describe('SelectMatchTargetUseCase', () => {
  // Test fixtures
  const mockTargetCard: Card = {
    card_id: '0142',
    month: 1,
    type: 'PLAIN',
    display_name: '松かす2',
  }

  const mockPossibleTargets: Card[] = [
    {
      card_id: '0142',
      month: 1,
      type: 'PLAIN',
      display_name: '松かす2',
    },
    {
      card_id: '0143',
      month: 1,
      type: 'PLAIN',
      display_name: '松かす3',
    },
  ]

  // Test helpers
  let mockSendCommandPort: ReturnType<typeof createMockSendCommandPort>
  let mockDomainFacade: ReturnType<typeof createMockDomainFacade>

  beforeEach(() => {
    mockSendCommandPort = createMockSendCommandPort()
    mockDomainFacade = createMockDomainFacade()
  })

  describe('Target validation (目標驗證)', () => {
    it('should return error when target is not in possible targets list', () => {
      // Arrange
      mockDomainFacade.validateTargetInList = vi.fn().mockReturnValue(false)

      const useCase = new SelectMatchTargetUseCase(mockSendCommandPort, mockDomainFacade)

      // Act
      const result = useCase.execute({
        sourceCardId: '0141',
        targetCardId: '0241', // 不在可選目標列表中
        possibleTargets: ['0142', '0143'],
      })

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('INVALID_TARGET')
      }

      expect(mockDomainFacade.validateTargetInList).toHaveBeenCalled()
      expect(mockSendCommandPort.selectTarget).not.toHaveBeenCalled()
    })

    it('should proceed when target is in possible targets list', async () => {
      // Arrange
      mockDomainFacade.validateTargetInList = vi.fn().mockReturnValue(true)

      const useCase = new SelectMatchTargetUseCase(mockSendCommandPort, mockDomainFacade)

      // Act
      const result = useCase.execute({
        sourceCardId: '0141',
        targetCardId: '0142',
        possibleTargets: ['0142', '0143'],
      })

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.value.valid).toBe(true)
      }

      expect(mockDomainFacade.validateTargetInList).toHaveBeenCalled()
      expect(mockSendCommandPort.selectTarget).toHaveBeenCalledWith('0141', '0142')
    })
  })

  describe('Command sending (命令發送)', () => {
    it('should send TurnSelectTarget command with correct parameters', async () => {
      // Arrange
      mockDomainFacade.validateTargetInList = vi.fn().mockReturnValue(true)

      const useCase = new SelectMatchTargetUseCase(mockSendCommandPort, mockDomainFacade)

      // Act
      const result = useCase.execute({
        sourceCardId: '0141',
        targetCardId: '0142',
        possibleTargets: ['0142', '0143'],
      })

      // Assert
      expect(result.success).toBe(true)
      expect(mockSendCommandPort.selectTarget).toHaveBeenCalledWith('0141', '0142')
      expect(mockSendCommandPort.selectTarget).toHaveBeenCalledTimes(1)
    })

    it('should handle first target in list', async () => {
      // Arrange
      mockDomainFacade.validateTargetInList = vi.fn().mockReturnValue(true)

      const useCase = new SelectMatchTargetUseCase(mockSendCommandPort, mockDomainFacade)

      // Act
      const result = useCase.execute({
        sourceCardId: '0141',
        targetCardId: '0142', // 第一個目標
        possibleTargets: ['0142', '0143', '0144'],
      })

      // Assert
      expect(result.success).toBe(true)
      expect(mockSendCommandPort.selectTarget).toHaveBeenCalledWith('0141', '0142')
    })

    it('should handle last target in list', async () => {
      // Arrange
      mockDomainFacade.validateTargetInList = vi.fn().mockReturnValue(true)

      const useCase = new SelectMatchTargetUseCase(mockSendCommandPort, mockDomainFacade)

      // Act
      const result = useCase.execute({
        sourceCardId: '0141',
        targetCardId: '0242', // 最後一個目標
        possibleTargets: ['0142', '0241', '0242'],
      })

      // Assert
      expect(result.success).toBe(true)
      expect(mockSendCommandPort.selectTarget).toHaveBeenCalledWith('0141', '0242')
    })

    it('should handle middle target in list', async () => {
      // Arrange
      mockDomainFacade.validateTargetInList = vi.fn().mockReturnValue(true)

      const useCase = new SelectMatchTargetUseCase(mockSendCommandPort, mockDomainFacade)

      // Act
      const result = useCase.execute({
        sourceCardId: '0141',
        targetCardId: '0241', // 中間目標
        possibleTargets: ['0142', '0241', '0242'],
      })

      // Assert
      expect(result.success).toBe(true)
      expect(mockSendCommandPort.selectTarget).toHaveBeenCalledWith('0141', '0241')
    })
  })

  describe('Edge cases (邊界情況)', () => {
    it('should handle single target in possible targets list', async () => {
      // Arrange
      mockDomainFacade.validateTargetInList = vi.fn().mockReturnValue(true)

      const useCase = new SelectMatchTargetUseCase(mockSendCommandPort, mockDomainFacade)

      // Act
      const result = useCase.execute({
        sourceCardId: '0141',
        targetCardId: '0142',
        possibleTargets: ['0142'], // 只有一個可選目標
      })

      // Assert
      expect(result.success).toBe(true)
      expect(mockSendCommandPort.selectTarget).toHaveBeenCalledWith('0141', '0142')
    })

    it('should return error when possible targets list is empty', () => {
      // Arrange
      mockDomainFacade.validateTargetInList = vi.fn().mockReturnValue(false)

      const useCase = new SelectMatchTargetUseCase(mockSendCommandPort, mockDomainFacade)

      // Act
      const result = useCase.execute({
        sourceCardId: '0141',
        targetCardId: '0142',
        possibleTargets: [], // 空列表
      })

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('INVALID_TARGET')
      }

      expect(mockSendCommandPort.selectTarget).not.toHaveBeenCalled()
    })

    it('should handle case when target not in list due to incorrect card ID', () => {
      // Arrange
      mockDomainFacade.validateTargetInList = vi.fn().mockReturnValue(false)

      const useCase = new SelectMatchTargetUseCase(mockSendCommandPort, mockDomainFacade)

      // Act
      const result = useCase.execute({
        sourceCardId: '0141',
        targetCardId: '9999', // 無效的卡片 ID
        possibleTargets: ['0142', '0143'],
      })

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('INVALID_TARGET')
      }
    })
  })

  describe('Integration with dependencies (依賴整合)', () => {
    it('should call domain facade with correct Card objects', () => {
      // Arrange
      mockDomainFacade.validateTargetInList = vi.fn().mockReturnValue(true)

      const useCase = new SelectMatchTargetUseCase(mockSendCommandPort, mockDomainFacade)

      // Act
      useCase.execute({
        sourceCardId: '0141',
        targetCardId: '0142',
        possibleTargets: ['0142', '0143'],
      })

      // Assert
      // Domain facade should be called with Card objects
      expect(mockDomainFacade.validateTargetInList).toHaveBeenCalled()

      // Note: The actual Card conversion logic will be in the Use Case implementation
      // This test verifies that the domain facade method is called
    })

    it('should propagate domain facade validation result', () => {
      // Arrange: Simulate domain facade rejecting the target
      mockDomainFacade.validateTargetInList = vi.fn().mockReturnValue(false)

      const useCase = new SelectMatchTargetUseCase(mockSendCommandPort, mockDomainFacade)

      // Act
      const result = useCase.execute({
        sourceCardId: '0141',
        targetCardId: '0142',
        possibleTargets: ['0142', '0143'],
      })

      // Assert: Use case should fail based on domain facade's validation
      expect(result.success).toBe(false)
      expect(mockSendCommandPort.selectTarget).not.toHaveBeenCalled()
    })
  })

  describe('Different card types (不同卡片類型)', () => {
    it('should handle BRIGHT card selection', async () => {
      // Arrange
      mockDomainFacade.validateTargetInList = vi.fn().mockReturnValue(true)

      const useCase = new SelectMatchTargetUseCase(mockSendCommandPort, mockDomainFacade)

      // Act
      const result = useCase.execute({
        sourceCardId: '0111', // 1月光牌
        targetCardId: '0131', // 1月短冊
        possibleTargets: ['0131'],
      })

      // Assert
      expect(result.success).toBe(true)
      expect(mockSendCommandPort.selectTarget).toHaveBeenCalledWith('0111', '0131')
    })

    it('should handle ANIMAL card selection', async () => {
      // Arrange
      mockDomainFacade.validateTargetInList = vi.fn().mockReturnValue(true)

      const useCase = new SelectMatchTargetUseCase(mockSendCommandPort, mockDomainFacade)

      // Act
      const result = useCase.execute({
        sourceCardId: '0221', // 2月種牌 (梅鶯)
        targetCardId: '0231', // 2月短冊
        possibleTargets: ['0231'],
      })

      // Assert
      expect(result.success).toBe(true)
      expect(mockSendCommandPort.selectTarget).toHaveBeenCalledWith('0221', '0231')
    })

    it('should handle RIBBON card selection', async () => {
      // Arrange
      mockDomainFacade.validateTargetInList = vi.fn().mockReturnValue(true)

      const useCase = new SelectMatchTargetUseCase(mockSendCommandPort, mockDomainFacade)

      // Act
      const result = useCase.execute({
        sourceCardId: '0331', // 3月短冊 (櫻赤短)
        targetCardId: '0341', // 3月かす1
        possibleTargets: ['0341'],
      })

      // Assert
      expect(result.success).toBe(true)
      expect(mockSendCommandPort.selectTarget).toHaveBeenCalledWith('0331', '0341')
    })
  })
})
