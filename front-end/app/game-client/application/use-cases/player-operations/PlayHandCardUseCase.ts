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
import type { SendCommandPort, NotificationPort, AnimationPort, ErrorHandlerPort } from '../../ports/output'
import type { DomainFacade } from '../../types/domain-facade'
import type { Result } from '../../types/result'
import { getCardById, type Card } from '~/game-client/domain'

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
   * @param errorHandler - 錯誤處理 Output Port
   */
  constructor(
    private readonly sendCommandPort: SendCommandPort,
    private readonly notification: NotificationPort,
    private readonly domainFacade: DomainFacade,
    private readonly animationPort: AnimationPort,
    private readonly errorHandler: ErrorHandlerPort
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
        this.sendCommand(input.cardId, input.targetCardId)
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
    if (matchableCards.length === 0 || matchableCards.length === 3) {
      // 無配對或三重配對：發送命令（無 target）
      this.sendCommand(input.cardId, undefined)

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

      this.sendCommand(input.cardId, targetCardId)

      return {
        success: true,
        value: {
          needSelection: false,
          selectedTarget: targetCardId,
        },
      }
    } else {
      // 雙重配對：UI 層應該已處理，不應該進入此分支
      return {
        success: false,
        error: 'DOUBLE_MATCH_REQUIRES_TARGET',
      }
    }
  }

  /**
   * 發送打牌命令並處理錯誤
   *
   * @param cardId - 手牌 ID
   * @param targetCardId - 配對目標 ID（可選）
   */
  private sendCommand(cardId: string, targetCardId: string | undefined): void {
    this.sendCommandPort.playHandCard(cardId, targetCardId).catch((error: unknown) => {
      this.errorHandler.handle(error)
    })
  }
}
