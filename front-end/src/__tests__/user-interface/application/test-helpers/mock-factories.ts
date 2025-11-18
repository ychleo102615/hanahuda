/**
 * Mock Factory Functions
 *
 * @description
 * 提供建立 Mock 依賴的工廠函數，
 * 用於 Application Layer Use Cases 的單元測試。
 *
 * 使用 Vitest Mock Utilities (vi.fn()) 建立 spy 函數，
 * 確保測試隔離性和可驗證性。
 *
 * @example
 * ```typescript
 * import { describe, it, expect } from 'vitest'
 * import { PlayHandCardUseCase } from '@/user-interface/application'
 * import {
 *   createMockSendCommandPort,
 *   createMockTriggerUIEffectPort,
 *   createMockDomainFacade
 * } from '../test-helpers/mock-factories'
 *
 * describe('PlayHandCardUseCase', () => {
 *   it('should trigger selection UI when multiple matches found', () => {
 *     // Arrange
 *     const mockDomainFacade = createMockDomainFacade({
 *       findMatchableCards: vi.fn().mockReturnValue(['0343', '0344'])
 *     })
 *
 *     const useCase = new PlayHandCardUseCase(
 *       createMockSendCommandPort(),
 *       createMockTriggerUIEffectPort(),
 *       mockDomainFacade
 *     )
 *
 *     // Act & Assert
 *     const result = useCase.execute({ ... })
 *     expect(result.success).toBe(true)
 *   })
 * })
 * ```
 */

import { vi } from 'vitest'
import type {
  SendCommandPort,
  UpdateUIStatePort,
  TriggerUIEffectPort,
} from '@/user-interface/application/ports'
import type { DomainFacade } from '@/user-interface/application/types'

/**
 * 建立 Mock SendCommandPort
 *
 * @description
 * 所有方法預設返回 resolved Promise。
 * 可以在測試中覆寫特定方法的行為。
 *
 * @example
 * ```typescript
 * const mockSendCommand = createMockSendCommandPort()
 *
 * // 驗證方法調用
 * await mockSendCommand.playHandCard('0341', '0343')
 * expect(mockSendCommand.playHandCard).toHaveBeenCalledWith('0341', '0343')
 *
 * // 覆寫方法行為
 * mockSendCommand.playHandCard = vi.fn().mockRejectedValue(new Error('Network error'))
 * ```
 */
export function createMockSendCommandPort(): SendCommandPort {
  return {
    playHandCard: vi.fn().mockResolvedValue(undefined),
    selectTarget: vi.fn().mockResolvedValue(undefined),
    makeDecision: vi.fn().mockResolvedValue(undefined),
  }
}

/**
 * 建立 Mock UpdateUIStatePort
 *
 * @description
 * 所有方法預設為空操作（no-op）。
 * `getCurrentPlayerId` 預設返回 'player-1'。
 * 可以在測試中驗證方法調用或覆寫行為。
 *
 * @example
 * ```typescript
 * const mockUpdateUIState = createMockUpdateUIStatePort()
 *
 * // 調用方法
 * mockUpdateUIState.setFlowStage('AWAITING_HAND_PLAY')
 * mockUpdateUIState.updateFieldCards(['0341', '0342'])
 *
 * // 驗證方法調用
 * expect(mockUpdateUIState.setFlowStage).toHaveBeenCalledWith('AWAITING_HAND_PLAY')
 * expect(mockUpdateUIState.updateFieldCards).toHaveBeenCalledWith(['0341', '0342'])
 *
 * // 覆寫 getCurrentPlayerId
 * mockUpdateUIState.getCurrentPlayerId = vi.fn().mockReturnValue('player-2')
 * ```
 */
export function createMockUpdateUIStatePort(): UpdateUIStatePort {
  return {
    initializeGameContext: vi.fn(),
    restoreGameState: vi.fn(),
    setFlowStage: vi.fn(),
    updateFieldCards: vi.fn(),
    updateHandCards: vi.fn(),
    updateDepositoryCards: vi.fn(),
    updateScores: vi.fn(),
    updateDeckRemaining: vi.fn(),
    updateKoiKoiMultiplier: vi.fn(),
    getCurrentPlayerId: vi.fn().mockReturnValue('player-1'),
  }
}

/**
 * 建立 Mock TriggerUIEffectPort
 *
 * @description
 * 所有方法預設為空操作（no-op）。
 * 可以在測試中驗證動畫觸發和 UI 效果。
 *
 * @example
 * ```typescript
 * const mockTriggerUIEffect = createMockTriggerUIEffectPort()
 *
 * // 調用方法
 * mockTriggerUIEffect.showSelectionUI(['0343', '0344'])
 * mockTriggerUIEffect.triggerAnimation('DEAL_CARDS', {
 *   fieldCards: ['0341'],
 *   hands: [{ player_id: 'p1', cards: ['0342'] }]
 * })
 *
 * // 驗證方法調用
 * expect(mockTriggerUIEffect.showSelectionUI).toHaveBeenCalledWith(['0343', '0344'])
 * expect(mockTriggerUIEffect.triggerAnimation).toHaveBeenCalledWith(
 *   'DEAL_CARDS',
 *   expect.objectContaining({ fieldCards: ['0341'] })
 * )
 * ```
 */
export function createMockTriggerUIEffectPort(): TriggerUIEffectPort {
  return {
    showSelectionUI: vi.fn(),
    showDecisionModal: vi.fn(),
    showErrorMessage: vi.fn(),
    showReconnectionMessage: vi.fn(),
    showGameFinishedUI: vi.fn(),
    showRoundDrawnUI: vi.fn(),
    triggerAnimation: vi.fn(),
  }
}

/**
 * 建立 Mock DomainFacade
 *
 * @description
 * 所有方法預設返回合理的預設值。
 * 支援部分覆寫（透過 overrides 參數）。
 *
 * @param overrides - 部分覆寫 DomainFacade 的方法
 *
 * @example
 * ```typescript
 * // 使用預設值
 * const mockDomainFacade = createMockDomainFacade()
 *
 * // 部分覆寫
 * const mockDomainFacade = createMockDomainFacade({
 *   findMatchableCards: vi.fn().mockReturnValue(['0343', '0344']),
 *   validateCardExists: vi.fn().mockReturnValue(false)
 * })
 *
 * // 驗證方法調用
 * mockDomainFacade.canMatch(card1, card2)
 * expect(mockDomainFacade.canMatch).toHaveBeenCalledWith(card1, card2)
 * ```
 */
export function createMockDomainFacade(overrides?: Partial<DomainFacade>): DomainFacade {
  return {
    canMatch: vi.fn().mockReturnValue(true),
    findMatchableCards: vi.fn().mockReturnValue([]),
    validateCardExists: vi.fn().mockReturnValue(true),
    validateTargetInList: vi.fn().mockReturnValue(true),
    calculateYakuProgress: vi.fn().mockReturnValue({
      required: [],
      obtained: [],
      missing: [],
      progress: 0,
    }),
    ...overrides,
  }
}
