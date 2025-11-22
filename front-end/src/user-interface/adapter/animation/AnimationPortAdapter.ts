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
import type { AnimationLayerStore } from '../stores'

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
  DEAL_CARD: 80,        // 單張發牌動畫時長
  DEAL_STAGGER: 100,    // 每張卡片延遲（T061）
  FLIP_FROM_DECK: 200,  // 翻牌動畫時長
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
  private animationLayerStore: AnimationLayerStore | null

  constructor(
    registry: ZoneRegistry = zoneRegistry,
    animationLayerStore: AnimationLayerStore | null = null
  ) {
    this.registry = registry
    this.animationLayerStore = animationLayerStore
  }

  // ===== 動畫方法 =====

  async playDealAnimation(params: DealAnimationParams): Promise<void> {
    // 檢查是否已中斷
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

    // 若無牌可發，直接返回
    if (params.fieldCards.length === 0 && params.playerHandCards.length === 0) {
      this._isAnimating = false
      return
    }

    // 預先隱藏所有將要動畫的卡片
    const allCardIds = [...params.fieldCards, ...params.playerHandCards]
    this.animationLayerStore?.hideCards(allCardIds)

    // 等待 DOM 渲染完成（兩個 frame 確保布局穩定）
    await new Promise(resolve => requestAnimationFrame(resolve))
    await new Promise(resolve => requestAnimationFrame(resolve))

    // T059/T061: 實作 staggered 發牌動畫
    // 發牌順序：先發場牌，再發玩家手牌
    // 每張牌間隔 DEAL_STAGGER ms

    try {
      // Phase 1: 發場牌 (8 張)
      for (let i = 0; i < params.fieldCards.length; i++) {
        // 檢查中斷
        if (this._interrupted) {
          this._interrupted = false
          return
        }

        const cardId = params.fieldCards[i]!
        const cardElement = findCardElement(cardId)

        // 執行單張發牌動畫
        if (cardElement && deckPosition && !this._interrupted) {
          await this.animateSingleDealCard(cardElement, deckPosition.rect)
          // 每張牌發完後調用回調（更新牌堆數量）
          params.onCardDealt?.()
        }

        // 再次檢查中斷
        if (this._interrupted) {
          this._interrupted = false
          return
        }

        // T061: 每張牌延遲（但最後一張不需要）
        if (i < params.fieldCards.length - 1 || params.playerHandCards.length > 0) {
          await sleep(ANIMATION_DURATION.DEAL_STAGGER)
        }
      }

      // Phase 2: 發玩家手牌 (8 張)
      for (let i = 0; i < params.playerHandCards.length; i++) {
        // 檢查中斷
        if (this._interrupted) {
          this._interrupted = false
          return
        }

        const cardId = params.playerHandCards[i]!
        const cardElement = findCardElement(cardId)

        // 執行單張發牌動畫
        if (cardElement && deckPosition && !this._interrupted) {
          await this.animateSingleDealCard(cardElement, deckPosition.rect)
          // 每張牌發完後調用回調（更新牌堆數量）
          params.onCardDealt?.()
        }

        // 再次檢查中斷
        if (this._interrupted) {
          this._interrupted = false
          return
        }

        // T061: 每張牌延遲（但最後一張不需要）
        if (i < params.playerHandCards.length - 1) {
          await sleep(ANIMATION_DURATION.DEAL_STAGGER)
        }
      }

      // 對手手牌不播放動畫（牌面朝下，直接出現）- 這裡不需要處理
    } finally {
      this._isAnimating = false
    }
  }

  /**
   * 單張發牌動畫輔助方法
   * @private
   * @param cardElement - 卡片 DOM 元素
   * @param fromRect - 牌堆位置（動畫起點）
   */
  private async animateSingleDealCard(
    cardElement: HTMLElement,
    fromRect: DOMRect
  ): Promise<void> {
    // 等待 DOM 布局完成
    await new Promise(resolve => requestAnimationFrame(resolve))
    await new Promise(resolve => requestAnimationFrame(resolve))
    await new Promise(resolve => requestAnimationFrame(resolve))

    const cardId = cardElement.getAttribute('data-card-id')
    const cardRect = cardElement.getBoundingClientRect()

    // 如果有動畫層 store，使用 Vue 組件方式
    if (this.animationLayerStore && cardId) {
      // 通過 store 添加動畫卡片，等待動畫完成
      await new Promise<void>(resolve => {
        this.animationLayerStore!.addCard({
          cardId,
          fromRect,
          toRect: cardRect,
          onComplete: resolve,
        })
      })

      // 動畫完成後顯示原始卡片
      this.animationLayerStore.showCard(cardId)
      return
    }

    // Fallback: 無動畫層時使用原有邏輯
    const originalZIndex = cardElement.style.zIndex
    const originalPosition = cardElement.style.position
    cardElement.style.zIndex = '9999'
    cardElement.style.position = 'relative'

    // 計算從牌堆到目標位置的位移
    const initialX = fromRect.x + fromRect.width / 2 - cardRect.x - cardRect.width / 2
    const initialY = fromRect.y + fromRect.height / 2 - cardRect.y - cardRect.height / 2

    const { apply } = useMotion(cardElement, {
      initial: {
        x: initialX,
        y: initialY,
        scale: 0.8,
        opacity: 0,
      },
      enter: {
        x: 0,
        y: 0,
        scale: 1,
        opacity: 1,
        transition: {
          type: 'spring',
          stiffness: 300,
          damping: 25,
        },
      },
    })

    await apply('enter')
    await sleep(ANIMATION_DURATION.DEAL_CARD)

    // 清理：恢復原始樣式
    cardElement.style.transform = ''
    cardElement.style.opacity = ''
    cardElement.style.zIndex = originalZIndex
    cardElement.style.position = originalPosition
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
    // TODO: 未來可改用分組區域 `${isOpponent ? 'opponent' : 'player'}-depository-${targetType}`
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
    // T060: 翻牌階段單張翻牌動畫
    // 從牌堆翻一張牌到場牌區

    if (this._interrupted) {
      this._interrupted = false
      return
    }

    this._isAnimating = true

    const deckPosition = this.registry.getPosition('deck')
    const fieldPosition = this.registry.getPosition('field')
    const cardElement = findCardElement(cardId)

    console.info('[AnimationPort] playFlipFromDeckAnimation', {
      cardId,
      deck: deckPosition ? 'found' : 'not registered',
      field: fieldPosition ? 'found' : 'not registered',
      hasElement: !!cardElement,
    })

    try {
      // 執行翻牌動畫
      if (cardElement && deckPosition && fieldPosition && !this._interrupted) {
        // A. 等待 DOM 布局完成
        await new Promise(resolve => requestAnimationFrame(resolve))

        // B. 保存原始樣式並設置動畫樣式
        const originalZIndex = cardElement.style.zIndex
        const originalPosition = cardElement.style.position
        cardElement.style.zIndex = '9999'
        cardElement.style.position = 'relative'

        // C. 計算卡片當前位置（DOM 已布局完成）
        const cardRect = cardElement.getBoundingClientRect()

        // 計算從牌堆到場牌的位移
        const initialX = deckPosition.rect.x + deckPosition.rect.width / 2 - cardRect.x - cardRect.width / 2
        const initialY = deckPosition.rect.y + deckPosition.rect.height / 2 - cardRect.y - cardRect.height / 2

        const { apply } = useMotion(cardElement, {
          initial: {
            x: initialX,
            y: initialY,
            scale: 0.8,
            opacity: 0,
            rotateY: 180,  // 牌面朝下
          },
          enter: {
            x: 0,
            y: 0,
            scale: 1,
            opacity: 1,
            rotateY: 0,    // 翻轉到牌面朝上
            transition: {
              type: 'spring',
              stiffness: 250,
              damping: 20,
            },
          },
        })

        await apply('enter')
        await sleep(ANIMATION_DURATION.FLIP_FROM_DECK)

        // D. 清理：恢復原始樣式
        cardElement.style.transform = ''
        cardElement.style.opacity = ''
        cardElement.style.zIndex = originalZIndex
        cardElement.style.position = originalPosition
      } else {
        // 無元素時等待時長
        if (!this._interrupted) {
          await sleep(ANIMATION_DURATION.FLIP_FROM_DECK)
        }
      }
    } finally {
      this._isAnimating = false
    }
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
 * @param animationLayerStore - 動畫層 store（可選，用於跨容器動畫）
 * @returns AnimationPort 實作
 */
export function createAnimationPortAdapter(
  animationLayerStore?: AnimationLayerStore
): AnimationPort {
  return new AnimationPortAdapter(zoneRegistry, animationLayerStore || null)
}
