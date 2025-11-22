/**
 * PlayHandCardUseCase
 *
 * @description
 * 處理玩家打出手牌的完整流程編排 Use Case。
 *
 * 業務流程：
 * 0. 檢查動畫狀態：若動畫進行中則阻止操作
 * 1. 預驗證：調用 Domain Facade 驗證卡片是否在手牌中
 * 2. 配對檢查：調用 Domain Facade 尋找可配對的場牌
 * 3. 根據配對結果：
 *    - 無配對/單一配對 → 發送命令到後端
 *    - 多重配對 → 觸發選擇 UI
 *
 * Clean Architecture 原則：
 * - 依賴反轉：通過 Output Ports 與外部通訊
 * - 單一職責：僅負責業務流程編排，不包含業務邏輯實作
 * - 可測試性：所有依賴可通過 Mock 替換
 *
 * @implements {PlayHandCardPort}
 */

import type {
  PlayHandCardPort,
  PlayHandCardInput,
  PlayHandCardOutput,
} from '../../ports/input/player-operations.port'
import type { SendCommandPort, TriggerUIEffectPort, AnimationPort } from '../../ports/output'
import type { DomainFacade, Result } from '../../types'
import { getCardById, type Card } from '@/user-interface/domain'

/**
 * PlayHandCardUseCase 實作
 */
export class PlayHandCardUseCase implements PlayHandCardPort {
  /**
   * 建構子
   *
   * @param sendCommandPort - 發送命令到後端的 Output Port
   * @param triggerUIEffectPort - 觸發 UI 效果的 Output Port
   * @param domainFacade - Domain Layer 業務邏輯門面
   * @param animationPort - 動畫系統 Output Port（用於檢查動畫狀態）
   */
  constructor(
    private readonly sendCommandPort: SendCommandPort,
    private readonly triggerUIEffectPort: TriggerUIEffectPort,
    private readonly domainFacade: DomainFacade,
    private readonly animationPort: AnimationPort
  ) {}

  /**
   * 執行打牌操作
   *
   * @param input - 打牌輸入參數
   * @returns 操作結果（成功/失敗）
   */
  execute(input: PlayHandCardInput): Result<PlayHandCardOutput> {
    // Step 0: 檢查動畫狀態 - 若動畫進行中則阻止操作
    if (this.animationPort.isAnimating()) {
      return {
        success: false,
        error: 'ANIMATION_IN_PROGRESS',
      }
    }

    // Step 1: Convert card IDs to Card objects
    const handCard = getCardById(input.cardId)
    if (!handCard) {
      return {
        success: false,
        error: 'CARD_NOT_IN_HAND',
      }
    }

    const handCardObjects = input.handCards
      .map(getCardById)
      .filter((c): c is Card => c !== undefined) as Card[]
    const fieldCardObjects = input.fieldCards
      .map(getCardById)
      .filter((c): c is Card => c !== undefined) as Card[]

    // Step 2: Pre-validation - 驗證卡片是否在手牌中
    const isCardInHand = this.domainFacade.validateCardExists(handCard, handCardObjects)

    if (!isCardInHand) {
      return {
        success: false,
        error: 'CARD_NOT_IN_HAND',
      }
    }

    // Step 3: Match checking - 尋找可配對的場牌
    const matchableCards = this.domainFacade.findMatchableCards(handCard, fieldCardObjects)

    // Step 4: Handle different match scenarios
    if (matchableCards.length === 0) {
      // 無配對：發送命令（無 target）
      this.sendCommandPort.playHandCard(input.cardId, undefined)

      return {
        success: true,
        value: {
          needSelection: false,
          selectedTarget: null,
        },
      }
    } else if (matchableCards.length === 1) {
      // 單一配對：直接發送命令（帶 target）
      const targetCardId = matchableCards[0]!.card_id

      this.sendCommandPort.playHandCard(input.cardId, targetCardId)

      return {
        success: true,
        value: {
          needSelection: false,
          selectedTarget: targetCardId,
        },
      }
    } else {
      // 多重配對：觸發選擇 UI
      const possibleTargetIds = matchableCards.map((card) => card.card_id)

      this.triggerUIEffectPort.showSelectionUI(possibleTargetIds)

      return {
        success: true,
        value: {
          needSelection: true,
          possibleTargets: possibleTargetIds,
        },
      }
    }
  }
}
