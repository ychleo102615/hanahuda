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
import type { SendCommandPort, NotificationPort, AnimationPort } from '../../ports/output'
import type { DomainFacade } from '../../types/domain-facade'
import type { Result } from '../../types/result'
import { getCardById, type Card } from '~/user-interface/domain'

/**
 * PlayHandCardUseCase 實作
 */
export class PlayHandCardUseCase implements PlayHandCardPort {
  /**
   * 建構子
   *
   * @param sendCommandPort - 發送命令到後端的 Output Port
   * @param notification - 觸發通知效果的 Output Port
   * @param domainFacade - Domain Layer 業務邏輯門面
   * @param animationPort - 動畫系統 Output Port（用於檢查動畫狀態）
   */
  constructor(
    private readonly sendCommandPort: SendCommandPort,
    private readonly notification: NotificationPort,
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
    // 如果有明確指定 targetCardId（手牌確認模式），則直接使用
    if (input.targetCardId) {
      // 驗證 targetCardId 是否在可配對列表中
      const isValidTarget = matchableCards.some(card => card.card_id === input.targetCardId)

      if (isValidTarget) {
        this.sendCommandPort.playHandCard(input.cardId, input.targetCardId)
        return {
          success: true,
          value: {
            needSelection: false,
            selectedTarget: input.targetCardId,
          },
        }
      } else {
        return {
          success: false,
          error: 'INVALID_TARGET',
        }
      }
    }

    // 沒有指定 targetCardId，根據配對數量自動處理
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
      // 多重配對：在新架構中，手牌多重配對通過「兩次點擊確認模式」處理
      // UI 層（PlayerHandZone）會進入 handCardConfirmationMode，玩家點擊場牌確認配對
      // 此分支不應該被執行到，因為 UI 層已經處理了配對選擇
      const possibleTargetIds = matchableCards.map((card) => card.card_id)

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
