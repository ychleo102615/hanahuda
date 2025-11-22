/**
 * AnimationPortAdapter
 *
 * @description
 * 實作 AnimationPort 介面的骨架版本。
 * Phase 4 僅提供 stub 實作，所有動畫方法立即 resolve。
 * Phase 6 將實作完整動畫邏輯（使用 ZoneRegistry 和 @vueuse/motion）。
 *
 * 職責：
 * - 提供可 await 的動畫 API
 * - 管理動畫狀態（isAnimating）
 * - 支援中斷機制（interrupt）
 */

import type { AnimationPort, DealAnimationParams } from '../../application/ports/output/animation.port'
import type { CardType } from '../../domain/types'

/**
 * AnimationPortAdapter 類別
 *
 * @description
 * Phase 4 骨架實作，所有動畫方法為 no-op。
 */
export class AnimationPortAdapter implements AnimationPort {
  private _isAnimating = false
  private _interrupted = false

  // ===== 動畫方法（Phase 4: stub 實作）=====

  async playDealAnimation(params: DealAnimationParams): Promise<void> {
    if (this._interrupted) {
      this._interrupted = false
      return
    }

    this._isAnimating = true
    console.info('[AnimationPort] playDealAnimation (stub)', {
      fieldCards: params.fieldCards.length,
      playerHandCards: params.playerHandCards.length,
      opponentHandCount: params.opponentHandCount,
    })

    // Phase 4: 立即完成
    this._isAnimating = false
  }

  async playCardToFieldAnimation(cardId: string, isOpponent: boolean): Promise<void> {
    if (this._interrupted) {
      this._interrupted = false
      return
    }

    this._isAnimating = true
    console.info('[AnimationPort] playCardToFieldAnimation (stub)', { cardId, isOpponent })

    // Phase 4: 立即完成
    this._isAnimating = false
  }

  async playMatchAnimation(handCardId: string, fieldCardId: string): Promise<void> {
    if (this._interrupted) {
      this._interrupted = false
      return
    }

    this._isAnimating = true
    console.info('[AnimationPort] playMatchAnimation (stub)', { handCardId, fieldCardId })

    // Phase 4: 立即完成
    this._isAnimating = false
  }

  async playToDepositoryAnimation(
    cardIds: string[],
    targetType: CardType,
    isOpponent: boolean
  ): Promise<void> {
    if (this._interrupted) {
      this._interrupted = false
      return
    }

    this._isAnimating = true
    console.info('[AnimationPort] playToDepositoryAnimation (stub)', {
      cardIds,
      targetType,
      isOpponent,
    })

    // Phase 4: 立即完成
    this._isAnimating = false
  }

  async playFlipFromDeckAnimation(cardId: string): Promise<void> {
    if (this._interrupted) {
      this._interrupted = false
      return
    }

    this._isAnimating = true
    console.info('[AnimationPort] playFlipFromDeckAnimation (stub)', { cardId })

    // Phase 4: 立即完成
    this._isAnimating = false
  }

  // ===== 控制方法 =====

  interrupt(): void {
    this._interrupted = true
    this._isAnimating = false
    console.info('[AnimationPort] interrupt')
  }

  isAnimating(): boolean {
    return this._isAnimating
  }
}

/**
 * 建立 AnimationPort Adapter
 *
 * @returns AnimationPort 實作
 */
export function createAnimationPortAdapter(): AnimationPort {
  return new AnimationPortAdapter()
}
