/**
 * MakeKoiKoiDecisionUseCase 測試
 *
 * @description
 * 測試 Koi-Koi 決策 Use Case 的業務流程編排邏輯：
 * - 計算當前役種與得分
 * - 可選：計算潛在分數（選擇繼續時）
 * - 發送 RoundMakeDecision 命令
 *
 * 測試策略：Mock Domain Facade 和 Output Ports，驗證業務流程編排
 *
 * 覆蓋率目標：> 90%（業務編排邏輯）
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { MakeKoiKoiDecisionUseCase } from '@/user-interface/application/use-cases/player-operations/MakeKoiKoiDecisionUseCase'
import {
  createMockSendCommandPort,
  createMockTriggerUIEffectPort,
  createMockDomainFacade,
} from '../../test-helpers/mock-factories'
import type { YakuScore } from '@/user-interface/application/types'

describe('MakeKoiKoiDecisionUseCase', () => {
  // Test fixtures
  const mockYakuScores: YakuScore[] = [
    { yaku_type: 'AKATAN', base_points: 5 },
    { yaku_type: 'TANE', base_points: 1 },
  ]

  // Test helpers
  let mockSendCommandPort: ReturnType<typeof createMockSendCommandPort>
  let mockTriggerUIEffectPort: ReturnType<typeof createMockTriggerUIEffectPort>
  let mockDomainFacade: ReturnType<typeof createMockDomainFacade>

  beforeEach(() => {
    mockSendCommandPort = createMockSendCommandPort()
    mockTriggerUIEffectPort = createMockTriggerUIEffectPort()
    mockDomainFacade = createMockDomainFacade()
  })

  describe('Score calculation (分數計算)', () => {
    it('should calculate current score from yaku list', () => {
      // Arrange
      const useCase = new MakeKoiKoiDecisionUseCase(
        mockSendCommandPort,
        mockTriggerUIEffectPort,
        mockDomainFacade
      )

      // Act
      const result = useCase.execute({
        currentYaku: mockYakuScores,
        depositoryCards: [],
        koiKoiMultiplier: 1,
        decision: 'END_ROUND',
      })

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        // 5 (AKATAN) + 1 (TANE) = 6 points
        expect(result.value.currentScore).toBe(6)
        expect(result.value.decision).toBe('END_ROUND')
      }
    })

    it('should apply koi-koi multiplier to score', () => {
      // Arrange
      const useCase = new MakeKoiKoiDecisionUseCase(
        mockSendCommandPort,
        mockTriggerUIEffectPort,
        mockDomainFacade
      )

      // Act
      const result = useCase.execute({
        currentYaku: mockYakuScores,
        depositoryCards: [],
        koiKoiMultiplier: 2, // 倍率 2x
        decision: 'END_ROUND',
      })

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        // (5 + 1) * 2 = 12 points
        expect(result.value.currentScore).toBe(12)
      }
    })

    it('should handle single yaku', () => {
      // Arrange
      const useCase = new MakeKoiKoiDecisionUseCase(
        mockSendCommandPort,
        mockTriggerUIEffectPort,
        mockDomainFacade
      )

      // Act
      const result = useCase.execute({
        currentYaku: [{ yaku_type: 'GOKO', base_points: 10 }],
        depositoryCards: [],
        koiKoiMultiplier: 1,
        decision: 'END_ROUND',
      })

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.value.currentScore).toBe(10)
      }
    })

    it('should handle multiple yaku with high multiplier', () => {
      // Arrange
      const useCase = new MakeKoiKoiDecisionUseCase(
        mockSendCommandPort,
        mockTriggerUIEffectPort,
        mockDomainFacade
      )

      const multipleYaku: YakuScore[] = [
        { yaku_type: 'GOKO', base_points: 10 },
        { yaku_type: 'AKATAN', base_points: 5 },
        { yaku_type: 'AOTAN', base_points: 5 },
      ]

      // Act
      const result = useCase.execute({
        currentYaku: multipleYaku,
        depositoryCards: [],
        koiKoiMultiplier: 4, // 4 次 Koi-Koi
        decision: 'END_ROUND',
      })

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        // (10 + 5 + 5) * 4 = 80 points
        expect(result.value.currentScore).toBe(80)
      }
    })

    it('should handle zero multiplier', () => {
      // Arrange
      const useCase = new MakeKoiKoiDecisionUseCase(
        mockSendCommandPort,
        mockTriggerUIEffectPort,
        mockDomainFacade
      )

      // Act
      const result = useCase.execute({
        currentYaku: mockYakuScores,
        depositoryCards: [],
        koiKoiMultiplier: 0, // 理論上不應該發生，但測試邊界情況
        decision: 'END_ROUND',
      })

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        // (5 + 1) * 0 = 0 points
        expect(result.value.currentScore).toBe(0)
      }
    })
  })

  describe('END_ROUND decision (結束回合決策)', () => {
    it('should send END_ROUND command', async () => {
      // Arrange
      const useCase = new MakeKoiKoiDecisionUseCase(
        mockSendCommandPort,
        mockTriggerUIEffectPort,
        mockDomainFacade
      )

      // Act
      const result = useCase.execute({
        currentYaku: mockYakuScores,
        depositoryCards: [],
        koiKoiMultiplier: 1,
        decision: 'END_ROUND',
      })

      // Assert
      expect(result.success).toBe(true)
      expect(mockSendCommandPort.makeDecision).toHaveBeenCalledWith('END_ROUND')
      expect(mockSendCommandPort.makeDecision).toHaveBeenCalledTimes(1)
    })

    it('should not calculate potential score when ending round', () => {
      // Arrange
      const useCase = new MakeKoiKoiDecisionUseCase(
        mockSendCommandPort,
        mockTriggerUIEffectPort,
        mockDomainFacade
      )

      // Act
      const result = useCase.execute({
        currentYaku: mockYakuScores,
        depositoryCards: [],
        koiKoiMultiplier: 1,
        decision: 'END_ROUND',
      })

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.value.potentialScore).toBeUndefined()
      }
    })
  })

  describe('KOI_KOI decision (繼續遊戲決策)', () => {
    it('should send KOI_KOI command', async () => {
      // Arrange
      const useCase = new MakeKoiKoiDecisionUseCase(
        mockSendCommandPort,
        mockTriggerUIEffectPort,
        mockDomainFacade
      )

      // Act
      const result = useCase.execute({
        currentYaku: mockYakuScores,
        depositoryCards: [],
        koiKoiMultiplier: 1,
        decision: 'KOI_KOI',
      })

      // Assert
      expect(result.success).toBe(true)
      expect(mockSendCommandPort.makeDecision).toHaveBeenCalledWith('KOI_KOI')
      expect(mockSendCommandPort.makeDecision).toHaveBeenCalledTimes(1)
    })

    it('should optionally calculate potential score when continuing', () => {
      // Arrange
      const useCase = new MakeKoiKoiDecisionUseCase(
        mockSendCommandPort,
        mockTriggerUIEffectPort,
        mockDomainFacade
      )

      // Act
      const result = useCase.execute({
        currentYaku: mockYakuScores,
        depositoryCards: [],
        koiKoiMultiplier: 1,
        decision: 'KOI_KOI',
      })

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        // Potential score is optional feature (可選功能)
        // If implemented, it should calculate score with next multiplier
        // (5 + 1) * 2 = 12 points
        if (result.value.potentialScore !== undefined) {
          expect(result.value.potentialScore).toBe(12)
        }
      }
    })

    it('should increase multiplier in potential score calculation', () => {
      // Arrange
      const useCase = new MakeKoiKoiDecisionUseCase(
        mockSendCommandPort,
        mockTriggerUIEffectPort,
        mockDomainFacade
      )

      // Act
      const result = useCase.execute({
        currentYaku: mockYakuScores,
        depositoryCards: [],
        koiKoiMultiplier: 3, // 當前倍率 3x
        decision: 'KOI_KOI',
      })

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        // Current score: (5 + 1) * 3 = 18
        expect(result.value.currentScore).toBe(18)

        // Potential score with next multiplier: (5 + 1) * 4 = 24 (可選)
        if (result.value.potentialScore !== undefined) {
          expect(result.value.potentialScore).toBe(24)
        }
      }
    })
  })

  describe('Edge cases (邊界情況)', () => {
    it('should handle empty yaku list', () => {
      // Arrange
      const useCase = new MakeKoiKoiDecisionUseCase(
        mockSendCommandPort,
        mockTriggerUIEffectPort,
        mockDomainFacade
      )

      // Act
      const result = useCase.execute({
        currentYaku: [],
        depositoryCards: [],
        koiKoiMultiplier: 1,
        decision: 'END_ROUND',
      })

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.value.currentScore).toBe(0)
      }
    })

    it('should handle decision with no depository cards', () => {
      // Arrange
      const useCase = new MakeKoiKoiDecisionUseCase(
        mockSendCommandPort,
        mockTriggerUIEffectPort,
        mockDomainFacade
      )

      // Act
      const result = useCase.execute({
        currentYaku: mockYakuScores,
        depositoryCards: [], // 空獲得區
        koiKoiMultiplier: 1,
        decision: 'END_ROUND',
      })

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.value.currentScore).toBe(6)
      }
    })

    it('should handle large yaku list', () => {
      // Arrange
      const useCase = new MakeKoiKoiDecisionUseCase(
        mockSendCommandPort,
        mockTriggerUIEffectPort,
        mockDomainFacade
      )

      const largeYakuList: YakuScore[] = [
        { yaku_type: 'GOKO', base_points: 10 },
        { yaku_type: 'SHIKO', base_points: 8 },
        { yaku_type: 'AKATAN', base_points: 5 },
        { yaku_type: 'AOTAN', base_points: 5 },
        { yaku_type: 'INOSHIKACHO', base_points: 5 },
        { yaku_type: 'TANE', base_points: 1 },
      ]

      // Act
      const result = useCase.execute({
        currentYaku: largeYakuList,
        depositoryCards: [],
        koiKoiMultiplier: 1,
        decision: 'END_ROUND',
      })

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        // 10 + 8 + 5 + 5 + 5 + 1 = 34 points
        expect(result.value.currentScore).toBe(34)
      }
    })
  })

  describe('Return value structure (返回值結構)', () => {
    it('should return correct structure for END_ROUND decision', () => {
      // Arrange
      const useCase = new MakeKoiKoiDecisionUseCase(
        mockSendCommandPort,
        mockTriggerUIEffectPort,
        mockDomainFacade
      )

      // Act
      const result = useCase.execute({
        currentYaku: mockYakuScores,
        depositoryCards: [],
        koiKoiMultiplier: 2,
        decision: 'END_ROUND',
      })

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.value).toHaveProperty('decision')
        expect(result.value).toHaveProperty('currentScore')
        expect(result.value.decision).toBe('END_ROUND')
        expect(typeof result.value.currentScore).toBe('number')
      }
    })

    it('should return correct structure for KOI_KOI decision', () => {
      // Arrange
      const useCase = new MakeKoiKoiDecisionUseCase(
        mockSendCommandPort,
        mockTriggerUIEffectPort,
        mockDomainFacade
      )

      // Act
      const result = useCase.execute({
        currentYaku: mockYakuScores,
        depositoryCards: [],
        koiKoiMultiplier: 1,
        decision: 'KOI_KOI',
      })

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.value).toHaveProperty('decision')
        expect(result.value).toHaveProperty('currentScore')
        expect(result.value.decision).toBe('KOI_KOI')
        expect(typeof result.value.currentScore).toBe('number')

        // potentialScore is optional
        if (result.value.potentialScore !== undefined) {
          expect(typeof result.value.potentialScore).toBe('number')
        }
      }
    })
  })

  describe('Integration with dependencies (依賴整合)', () => {
    it('should call send command port with decision', async () => {
      // Arrange
      const useCase = new MakeKoiKoiDecisionUseCase(
        mockSendCommandPort,
        mockTriggerUIEffectPort,
        mockDomainFacade
      )

      // Act - END_ROUND
      await useCase.execute({
        currentYaku: mockYakuScores,
        depositoryCards: [],
        koiKoiMultiplier: 1,
        decision: 'END_ROUND',
      })

      expect(mockSendCommandPort.makeDecision).toHaveBeenCalledWith('END_ROUND')

      // Act - KOI_KOI
      await useCase.execute({
        currentYaku: mockYakuScores,
        depositoryCards: [],
        koiKoiMultiplier: 1,
        decision: 'KOI_KOI',
      })

      expect(mockSendCommandPort.makeDecision).toHaveBeenCalledWith('KOI_KOI')
    })

    it('should not call domain facade for basic score calculation', () => {
      // Arrange
      const useCase = new MakeKoiKoiDecisionUseCase(
        mockSendCommandPort,
        mockTriggerUIEffectPort,
        mockDomainFacade
      )

      // Act
      useCase.execute({
        currentYaku: mockYakuScores,
        depositoryCards: [],
        koiKoiMultiplier: 1,
        decision: 'END_ROUND',
      })

      // Assert
      // Basic score calculation doesn't need domain facade
      // (it's just summing yaku_base_points from the list)
      // Domain facade would be used for yaku detection, not score calculation
      expect(mockDomainFacade.calculateYakuProgress).not.toHaveBeenCalled()
    })
  })
})
