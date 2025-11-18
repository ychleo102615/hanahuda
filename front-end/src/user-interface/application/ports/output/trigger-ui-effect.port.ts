/**
 * TriggerUIEffectPort - Output Port
 *
 * @description
 * 由 Application Layer 定義，Adapter Layer 實作。
 * 負責觸發 UI 效果（動畫、Modal、訊息提示等）。
 *
 * 使用於：
 * - PlayHandCardUseCase
 * - MakeKoiKoiDecisionUseCase
 * - All Handle*UseCase（事件處理器）
 *
 * @example
 * ```typescript
 * // Adapter Layer 實作範例
 * class VueTriggerUIEffectAdapter implements TriggerUIEffectPort {
 *   showSelectionUI(possibleTargets: string[]): void {
 *     // 觸發 Vue 組件顯示選擇 UI
 *   }
 *
 *   triggerAnimation(type, params): void {
 *     // 使用 Vue Transition 或 CSS 動畫
 *   }
 * }
 * ```
 */

import type { YakuScore } from '../../types'

/**
 * 動畫類型
 *
 * @description
 * Application Layer 定義抽象的動畫類型，
 * Adapter Layer 根據類型實作具體動畫邏輯。
 */
export type AnimationType = 'DEAL_CARDS' | 'CARD_MOVE' | 'YAKU_EFFECT' | 'SCORE_UPDATE'

/**
 * 動畫參數（泛型，根據動畫類型決定）
 *
 * @description
 * 使用 TypeScript 條件型別確保動畫參數與類型匹配。
 */
export type AnimationParams<T extends AnimationType = AnimationType> = T extends 'DEAL_CARDS'
  ? {
      fieldCards: string[]
      hands: Array<{ player_id: string; cards: string[] }>
    }
  : T extends 'CARD_MOVE'
    ? {
        cardId: string
        from: 'hand' | 'field' | 'deck'
        to: 'field' | 'depository'
      }
    : T extends 'YAKU_EFFECT'
      ? {
          yakuType: string
          affectedCards: string[]
        }
      : T extends 'SCORE_UPDATE'
        ? {
            playerId: string
            oldScore: number
            newScore: number
          }
        : never

export interface TriggerUIEffectPort {
  /**
   * 顯示選擇配對 UI
   *
   * @param possibleTargets - 可選目標列表
   *
   * @example
   * ```typescript
   * triggerUIEffect.showSelectionUI(['0343', '0344'])
   * ```
   */
  showSelectionUI(possibleTargets: string[]): void

  /**
   * 顯示 Koi-Koi 決策 Modal
   *
   * @param currentYaku - 當前役種列表
   * @param currentScore - 當前分數
   * @param potentialScore - 潛在分數（可選）
   *
   * @example
   * ```typescript
   * triggerUIEffect.showDecisionModal(
   *   [{ yaku_type: 'INOU_SHIKO', base_points: 5 }],
   *   5,
   *   10
   * )
   * ```
   */
  showDecisionModal(
    currentYaku: YakuScore[],
    currentScore: number,
    potentialScore?: number,
  ): void

  /**
   * 顯示錯誤訊息
   *
   * @param message - 錯誤訊息
   *
   * @example
   * ```typescript
   * triggerUIEffect.showErrorMessage('This card is not in your hand')
   * ```
   */
  showErrorMessage(message: string): void

  /**
   * 顯示重連成功訊息
   *
   * @example
   * ```typescript
   * triggerUIEffect.showReconnectionMessage()
   * ```
   */
  showReconnectionMessage(): void

  /**
   * 觸發動畫
   *
   * @param type - 動畫類型
   * @param params - 動畫參數（根據 type 決定）
   *
   * @example
   * ```typescript
   * // 發牌動畫
   * triggerUIEffect.triggerAnimation('DEAL_CARDS', {
   *   fieldCards: ['0341', '0342'],
   *   hands: [{ player_id: 'p1', cards: ['0343'] }]
   * })
   *
   * // 卡片移動動畫
   * triggerUIEffect.triggerAnimation('CARD_MOVE', {
   *   cardId: '0341',
   *   from: 'hand',
   *   to: 'depository'
   * })
   *
   * // 役種特效
   * triggerUIEffect.triggerAnimation('YAKU_EFFECT', {
   *   yakuType: 'INOU_SHIKO',
   *   affectedCards: ['0341', '0342', '0343', '0344']
   * })
   *
   * // 分數變化動畫
   * triggerUIEffect.triggerAnimation('SCORE_UPDATE', {
   *   playerId: 'player-1',
   *   oldScore: 0,
   *   newScore: 10
   * })
   * ```
   */
  triggerAnimation<T extends AnimationType>(type: T, params: AnimationParams<T>): void
}
