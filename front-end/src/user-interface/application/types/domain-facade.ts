/**
 * Domain Facade 介面
 *
 * @description
 * 包裝 Domain Layer 的純函數為介面，
 * 使得 Application Layer 的 Use Cases 可以通過依賴注入方式使用，
 * 並在測試時輕鬆 Mock。
 *
 * Domain Layer 位於: src/user-interface/domain/
 *
 * @example
 * ```typescript
 * // 生產環境實作
 * import * as domain from '@/user-interface/domain'
 *
 * const domainFacade: DomainFacade = {
 *   canMatch: domain.canMatch,
 *   findMatchableCards: domain.findMatchableCards,
 *   validateCardExists: domain.validateCardExists,
 *   validateTargetInList: domain.validateTargetInList,
 *   calculateYakuProgress: domain.calculateYakuProgress,
 * }
 *
 * // 測試環境 Mock
 * const mockDomainFacade: DomainFacade = {
 *   canMatch: vi.fn().mockReturnValue(true),
 *   findMatchableCards: vi.fn().mockReturnValue([]),
 *   // ...
 * }
 * ```
 */

// Import Domain Layer types (這些型別定義在 Domain Layer)
// 注意：這裡使用 type import，不會引入執行時依賴
import type { Card, CardType, YakuType, YakuProgress, ValidationResult } from '@/user-interface/domain'

/**
 * Domain Facade 介面
 *
 * @description
 * 提供 Domain Layer 業務邏輯的抽象介面
 */
export interface DomainFacade {
  /**
   * 判斷兩張卡片是否可以配對（同月份）
   *
   * @param card1 - 第一張卡片
   * @param card2 - 第二張卡片
   * @returns 是否可以配對
   */
  canMatch(card1: Readonly<Card>, card2: Readonly<Card>): boolean

  /**
   * 尋找場上所有可與手牌配對的卡片
   *
   * @param handCard - 手牌
   * @param fieldCards - 場牌列表
   * @returns 可配對的場牌列表
   */
  findMatchableCards(handCard: Readonly<Card>, fieldCards: readonly Card[]): readonly Card[]

  /**
   * 驗證卡片是否存在於手牌中
   *
   * @param card - 要驗證的卡片
   * @param handCards - 手牌列表
   * @returns 驗證結果
   */
  validateCardExists(card: Readonly<Card>, handCards: readonly Card[]): ValidationResult

  /**
   * 驗證目標卡片是否在可選目標列表中
   *
   * @param target - 目標卡片
   * @param possibleTargets - 可選目標列表
   * @returns 驗證結果
   */
  validateTargetInList(target: Readonly<Card>, possibleTargets: readonly Card[]): ValidationResult

  /**
   * 計算役種進度
   *
   * @param yakuType - 役種類型
   * @param depositoryCards - 獲得區卡片
   * @returns 役種進度（所需卡片、已獲得卡片、缺少卡片、完成度）
   */
  calculateYakuProgress(yakuType: YakuType, depositoryCards: readonly Card[]): YakuProgress

  /**
   * 從 card_id 解析卡片類型
   *
   * @param cardId - 卡片 ID（MMTI 格式）
   * @returns 卡片類型
   */
  getCardTypeFromId(cardId: string): CardType
}
