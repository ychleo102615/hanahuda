/**
 * AnimationPortAdapter
 *
 * @description
 * 實作 AnimationPort 介面，使用 ZoneRegistry 追蹤位置。
 * Phase 7 實作基礎動畫時序，視覺效果將在組件層使用 @vueuse/motion。
 *
 * 職責：
 * - 提供可 await 的動畫 API
 * - 管理動畫狀態（isAnimating）
 * - 支援中斷機制（interrupt）
 * - 與 ZoneRegistry 整合計算位置
 */

import type { AnimationPort, DealAnimationParams } from '../../application/ports/output/animation.port'
import type { CardType } from '../../domain/types'
import { zoneRegistry, type ZoneRegistry } from './ZoneRegistry'
import type { ZoneName } from './types'
import { useMotion } from '@vueuse/motion'

/**
 * 輔助函數：等待指定時間
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 動畫時長常數 (ms)
 */
const ANIMATION_DURATION = {
  CARD_TO_FIELD: 200,
  MATCH_EFFECT: 150,
  TO_DEPOSITORY: 300,
  DEAL_CARD: 100,
  FLIP_FROM_DECK: 300,
}

/**
 * 查找卡片 DOM 元素
 */
function findCardElement(cardId: string): HTMLElement | null {
  return document.querySelector(`[data-card-id="${cardId}"]`) as HTMLElement | null
}

/**
 * AnimationPortAdapter 類別
 *
 * @description
 * 實作 AnimationPort 介面，管理動畫時序和狀態。
 */
export class AnimationPortAdapter implements AnimationPort {
  private _isAnimating = false
  private _interrupted = false
  private registry: ZoneRegistry

  constructor(registry: ZoneRegistry = zoneRegistry) {
    this.registry = registry
  }

  // ===== 動畫方法 =====

  async playDealAnimation(params: DealAnimationParams): Promise<void> {
    if (this._interrupted) {
      this._interrupted = false
      return
    }

    this._isAnimating = true

    const deckPosition = this.registry.getPosition('deck')
    console.info('[AnimationPort] playDealAnimation', {
      fieldCards: params.fieldCards.length,
      playerHandCards: params.playerHandCards.length,
      opponentHandCount: params.opponentHandCount,
      deckPosition: deckPosition ? 'found' : 'not registered',
    })

    // TODO: Phase 8 實作實際發牌動畫
    // 暫時立即完成
    this._isAnimating = false
  }

  async playCardToFieldAnimation(cardId: string, isOpponent: boolean): Promise<void> {
    if (this._interrupted) {
      this._interrupted = false
      return
    }

    this._isAnimating = true

    const fromZone: ZoneName = isOpponent ? 'opponent-hand' : 'player-hand'
    const fromPosition = this.registry.getPosition(fromZone)
    const toPosition = this.registry.getPosition('field')
    const cardElement = findCardElement(cardId)

    console.info('[AnimationPort] playCardToFieldAnimation', {
      cardId,
      isOpponent,
      hasElement: !!cardElement,
    })

    // 執行實際動畫
    if (cardElement && fromPosition && toPosition && !this._interrupted) {
      const deltaX = toPosition.rect.x - fromPosition.rect.x
      const deltaY = toPosition.rect.y - fromPosition.rect.y

      const { apply } = useMotion(cardElement, {
        initial: { x: 0, y: 0 },
        enter: {
          x: deltaX,
          y: deltaY,
          transition: {
            type: 'spring',
            stiffness: 300,
            damping: 25,
          },
        },
      })

      await apply('enter')
      await sleep(ANIMATION_DURATION.CARD_TO_FIELD)

      // 清理 transform（讓 Vue 組件管理最終位置）
      cardElement.style.transform = ''
    } else {
      // 無元素時等待時長
      await sleep(ANIMATION_DURATION.CARD_TO_FIELD)
    }

    this._isAnimating = false
  }

  async playMatchAnimation(handCardId: string, fieldCardId: string): Promise<void> {
    if (this._interrupted) {
      this._interrupted = false
      return
    }

    this._isAnimating = true

    const handCardElement = findCardElement(handCardId)
    const fieldCardElement = findCardElement(fieldCardId)

    console.info('[AnimationPort] playMatchAnimation (merge effect)', {
      handCardId,
      fieldCardId,
      hasHandElement: !!handCardElement,
      hasFieldElement: !!fieldCardElement,
    })

    // 執行合併特效（縮放 + 發光）
    if ((handCardElement || fieldCardElement) && !this._interrupted) {
      const elements = [handCardElement, fieldCardElement].filter(Boolean) as HTMLElement[]

      // 對所有元素執行合併特效
      const animations = elements.map(element => {
        const { apply } = useMotion(element, {
          initial: { scale: 1 },
          enter: {
            scale: [1, 1.15, 1],
            transition: {
              duration: ANIMATION_DURATION.MATCH_EFFECT,
              ease: 'easeInOut',
            },
          },
        })
        return apply('enter')
      })

      await Promise.all(animations)

      // 清理樣式
      elements.forEach(el => {
        el.style.transform = ''
      })
    } else {
      await sleep(ANIMATION_DURATION.MATCH_EFFECT)
    }

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

    const depositoryZone: ZoneName = isOpponent ? 'opponent-depository' : 'player-depository'
    const targetZone: ZoneName = `${isOpponent ? 'opponent' : 'player'}-depository-${targetType}` as ZoneName
    const depositoryPosition = this.registry.getPosition(depositoryZone)
    const fieldPosition = this.registry.getPosition('field')

    // 找到所有卡片元素
    const cardElements = cardIds
      .map(id => findCardElement(id))
      .filter(Boolean) as HTMLElement[]

    console.info('[AnimationPort] playToDepositoryAnimation', {
      cardIds,
      targetType,
      isOpponent,
      hasElements: cardElements.length,
    })

    // 執行移動動畫
    if (cardElements.length > 0 && depositoryPosition && !this._interrupted) {
      // 計算從場牌到獲得區的位移
      const fromRect = fieldPosition?.rect || { x: 0, y: 0 }
      const toRect = depositoryPosition.rect

      const deltaX = toRect.x - fromRect.x
      const deltaY = toRect.y - fromRect.y

      const animations = cardElements.map(element => {
        const { apply } = useMotion(element, {
          initial: { x: 0, y: 0, opacity: 1 },
          enter: {
            x: deltaX,
            y: deltaY,
            opacity: [1, 1, 0.8],
            transition: {
              type: 'spring',
              stiffness: 200,
              damping: 20,
            },
          },
        })
        return apply('enter')
      })

      await Promise.all(animations)
      await sleep(ANIMATION_DURATION.TO_DEPOSITORY)

      // 清理樣式
      cardElements.forEach(el => {
        el.style.transform = ''
        el.style.opacity = ''
      })
    } else {
      await sleep(ANIMATION_DURATION.TO_DEPOSITORY)
    }

    this._isAnimating = false
  }

  async playFlipFromDeckAnimation(cardId: string): Promise<void> {
    if (this._interrupted) {
      this._interrupted = false
      return
    }

    this._isAnimating = true

    const deckPosition = this.registry.getPosition('deck')
    const fieldPosition = this.registry.getPosition('field')

    console.info('[AnimationPort] playFlipFromDeckAnimation', {
      cardId,
      deck: deckPosition ? 'found' : 'not registered',
      field: fieldPosition ? 'found' : 'not registered',
    })

    // 等待翻牌動畫時長
    if (!this._interrupted) {
      await sleep(ANIMATION_DURATION.FLIP_FROM_DECK)
    }

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
