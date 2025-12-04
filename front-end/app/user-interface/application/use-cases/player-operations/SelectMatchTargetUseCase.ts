/**
 * SelectMatchTargetUseCase
 *
 * @description
 * 處理玩家選擇配對目標的業務流程編排 Use Case。
 *
 * 業務流程：
 * 0. 檢查動畫狀態：若動畫進行中則阻止操作
 * 1. 驗證：調用 Domain Facade 驗證目標卡片是否在可選目標列表中
 * 2. 發送命令：調用 SendCommandPort 發送 TurnSelectTarget 命令到後端
 *
 * Clean Architecture 原則：
 * - 依賴反轉：通過 Output Ports 與外部通訊
 * - 單一職責：僅負責業務流程編排，不包含業務邏輯實作
 * - 可測試性：所有依賴可通過 Mock 替換
 *
 * @implements {SelectMatchTargetPort}
 */

import type {
  SelectMatchTargetPort,
  SelectMatchTargetInput,
  SelectMatchTargetOutput,
} from '../../ports/input/player-operations.port'
import type { SendCommandPort, AnimationPort } from '../../ports/output'
import type { DomainFacade, Result } from '../../types'
import { getCardById, type Card } from '~/user-interface/domain'

/**
 * SelectMatchTargetUseCase 實作
 */
export class SelectMatchTargetUseCase implements SelectMatchTargetPort {
  /**
   * 建構子
   *
   * @param sendCommandPort - 發送命令到後端的 Output Port
   * @param domainFacade - Domain Layer 業務邏輯門面
   * @param animationPort - 動畫系統 Output Port（用於檢查動畫狀態）
   */
  constructor(
    private readonly sendCommandPort: SendCommandPort,
    private readonly domainFacade: DomainFacade,
    private readonly animationPort: AnimationPort
  ) {}

  /**
   * 執行選擇配對目標操作
   *
   * @param input - 選擇輸入參數
   * @returns 操作結果（成功/失敗）
   */
  execute(input: SelectMatchTargetInput): Result<SelectMatchTargetOutput> {
    // Step 0: 檢查動畫狀態 - 若動畫進行中則阻止操作
    if (this.animationPort.isAnimating()) {
      return {
        success: false,
        error: 'ANIMATION_IN_PROGRESS',
      }
    }

    // Step 1: Convert card IDs to Card objects
    const targetCard = getCardById(input.targetCardId)
    if (!targetCard) {
      return {
        success: false,
        error: 'INVALID_TARGET',
      }
    }

    const possibleTargetObjects = input.possibleTargets
      .map(getCardById)
      .filter((c): c is Card => c !== undefined) as Card[]

    // Step 2: Validation - 驗證目標是否在可選目標列表中
    const isTargetValid = this.domainFacade.validateTargetInList(targetCard, possibleTargetObjects)

    if (!isTargetValid) {
      return {
        success: false,
        error: 'INVALID_TARGET',
      }
    }

    // Step 3: Send command - 發送 TurnSelectTarget 命令到後端
    this.sendCommandPort.selectTarget(input.sourceCardId, input.targetCardId)

    return {
      success: true,
      value: {
        valid: true,
      },
    }
  }
}
