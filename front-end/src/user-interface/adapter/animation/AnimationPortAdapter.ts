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
 * 輔助函數：等待 DOM 布局完成
 */
async function waitForLayout(frames = 2): Promise<void> {
  for (let i = 0; i < frames; i++) {
    await new Promise(resolve => requestAnimationFrame(resolve))
  }
}

/**
 * 動畫時長常數 (ms)
 */
const ANIMATION_DURATION = {
  CARD_TO_FIELD: 200,
  MATCH_EFFECT: 150,
  TO_DEPOSITORY: 300,
  DEAL_CARD: 80,        // 單張發牌動畫時長
  DEAL_STAGGER: 0,    // 每張卡片延遲（T061）
  FLIP_FROM_DECK: 200,  // 翻牌動畫時長
}

/**
 * 卡片偏移量常數（用於重疊動畫時的視覺區分）
 */
const CARD_OFFSET = {
  X: 8,
  Y: -8,
}

/**
 * 計算多張卡片的包圍盒（最小外接矩形）
 *
 * @description
 * 用於 CardGroup 容器定位，確保 transform-origin 正確。
 */
function calculateBoundingBox(rects: DOMRect[]): DOMRect {
  if (rects.length === 0) {
    return new DOMRect(0, 0, 0, 0)
  }

  const minX = Math.min(...rects.map(r => r.x))
  const minY = Math.min(...rects.map(r => r.y))
  const maxX = Math.max(...rects.map(r => r.x + r.width))
  const maxY = Math.max(...rects.map(r => r.y + r.height))

  return new DOMRect(minX, minY, maxX - minX, maxY - minY)
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
  private animationLayerStore: AnimationLayerStore

  constructor(
    registry: ZoneRegistry,
    animationLayerStore: AnimationLayerStore
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
      isPlayerDealer: params.isPlayerDealer,
      deckPosition: deckPosition ? 'found' : 'not registered',
    })

    // 若無牌可發，直接返回
    if (params.fieldCards.length === 0 && params.playerHandCards.length === 0 && params.opponentHandCount === 0) {
      this._isAnimating = false
      return
    }

    // 預先隱藏所有將要動畫的卡片
    const allCardIds = [...params.fieldCards, ...params.playerHandCards]
    this.animationLayerStore?.hideCards(allCardIds)

    // 等待 DOM 渲染完成（兩個 frame 確保布局穩定）
    await waitForLayout()

    try {
      // 花札發牌順序：4 輪手牌 → 場牌
      // 每輪：莊家 2 張 → 閒家 2 張

      let playerCardIndex = 0
      let opponentCardIndex = 0

      // 4 輪手牌發牌
      for (let round = 0; round < 4; round++) {
        // 檢查中斷
        if (this._interrupted) {
          this._interrupted = false
          return
        }

        // 決定發牌順序：莊家先發
        const dealOrder = params.isPlayerDealer
          ? ['player', 'opponent'] as const
          : ['opponent', 'player'] as const

        for (const target of dealOrder) {
          // 每次發 2 張
          for (let j = 0; j < 2; j++) {
            if (this._interrupted) {
              this._interrupted = false
              return
            }

            if (target === 'player') {
              // 發玩家手牌
              if (playerCardIndex < params.playerHandCards.length) {
                const cardId = params.playerHandCards[playerCardIndex]!
                const cardElement = findCardElement(cardId)

                if (cardElement && deckPosition && !this._interrupted) {
                  params.onCardDealt?.()
                  this.animateSingleDealCard(cardElement, deckPosition.rect)
                  await sleep(ANIMATION_DURATION.DEAL_CARD)
                }
                playerCardIndex++
              }
            } else {
              // 發對手手牌
              if (opponentCardIndex < params.opponentHandCount) {
                if (deckPosition && !this._interrupted) {
                  params.onCardDealt?.()
                  this.animateOpponentDealCard(opponentCardIndex, deckPosition.rect)
                  await sleep(ANIMATION_DURATION.DEAL_CARD)
                }
                opponentCardIndex++
              }
            }

            // 每張牌延遲
            await sleep(ANIMATION_DURATION.DEAL_STAGGER)
          }
        }
      }

      // 第 5 輪：發場牌 (8 張)
      for (let i = 0; i < params.fieldCards.length; i++) {
        if (this._interrupted) {
          this._interrupted = false
          return
        }

        const cardId = params.fieldCards[i]!
        const cardElement = findCardElement(cardId)

        if (cardElement && deckPosition && !this._interrupted) {
          params.onCardDealt?.()
          this.animateSingleDealCard(cardElement, deckPosition.rect)
          await sleep(ANIMATION_DURATION.DEAL_CARD)
        }

        // 每張牌延遲（最後一張不需要）
        if (i < params.fieldCards.length - 1) {
          await sleep(ANIMATION_DURATION.DEAL_STAGGER)
        }
      }
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
    await waitForLayout(3)

    const cardId = cardElement.getAttribute('data-card-id')
    const cardRect = cardElement.getBoundingClientRect()

    // 使用動畫層 Vue 組件方式
    if (!cardId) {
      return
    }

    // 通過 store 添加動畫卡片，等待動畫完成
    await new Promise<void>(resolve => {
      this.animationLayerStore.addCard({
        cardId,
        fromRect,
        toRect: cardRect,
        onComplete: resolve,
      })
    })

    // 動畫完成後顯示原始卡片
    this.animationLayerStore.showCard(cardId)
  }

  /**
   * 對手發牌動畫輔助方法
   * @private
   * @param cardIndex - 卡片索引（用於計算目標位置）
   * @param fromRect - 牌堆位置（動畫起點）
   */
  private async animateOpponentDealCard(
    cardIndex: number,
    fromRect: DOMRect
  ): Promise<void> {
    // 獲取對手手牌區域位置
    const opponentHandPosition = this.registry.getPosition('opponent-hand')
    if (!opponentHandPosition) {
      console.warn('[AnimationPort] opponent-hand zone not registered')
      return
    }

    // 計算目標位置（使用 getCardPosition 計算每張牌的位置）
    const cardPosition = this.registry.getCardPosition('opponent-hand', cardIndex)
    if (!cardPosition) {
      console.warn('[AnimationPort] Cannot calculate card position for index', cardIndex)
      return
    }

    // 創建虛擬 cardId 用於動畫
    const virtualCardId = `opponent-hand-${cardIndex}`

    // 創建目標 DOMRect
    const toRect = new DOMRect(
      cardPosition.x,
      cardPosition.y,
      60,  // CARD_WIDTH
      90   // CARD_HEIGHT (估算)
    )

    // 通過 store 添加動畫卡片，設定 isFaceDown 為 true
    await new Promise<void>(resolve => {
      this.animationLayerStore.addCard({
        cardId: virtualCardId,
        fromRect,
        toRect,
        onComplete: resolve,
        isFaceDown: true,  // 對手牌顯示牌背
      })
    })

    // 對手牌不需要 showCard，動畫完成後直接移除
  }

  async playCardToFieldAnimation(cardId: string, isOpponent: boolean, targetCardId?: string): Promise<void> {
    if (this._interrupted) {
      this._interrupted = false
      return
    }

    this._isAnimating = true

    const cardElement = findCardElement(cardId)
    const targetElement = targetCardId ? findCardElement(targetCardId) : null
    const fieldPosition = this.registry.getPosition('field')

    console.info('[AnimationPort] playCardToFieldAnimation', {
      cardId,
      isOpponent,
      targetCardId,
      hasElement: !!cardElement,
      hasTarget: !!targetElement,
    })

    // 計算卡片尺寸（預設值）
    const cardWidth = 60
    const cardHeight = 90

    // 計算起始位置
    let fromRect: DOMRect
    let isFaceDown = false

    if (cardElement) {
      // 玩家手牌：使用真實 DOM 位置
      fromRect = cardElement.getBoundingClientRect()
    } else if (isOpponent) {
      // 對手手牌：從對手手牌區位置開始，顯示牌背
      const opponentHandPosition = this.registry.getPosition('opponent-hand')
      if (opponentHandPosition) {
        // 從對手手牌區中心開始
        fromRect = new DOMRect(
          opponentHandPosition.rect.x + opponentHandPosition.rect.width / 2 - cardWidth / 2,
          opponentHandPosition.rect.y + opponentHandPosition.rect.height / 2 - cardHeight / 2,
          cardWidth,
          cardHeight
        )
      } else {
        // 備用：等待時長
        await sleep(ANIMATION_DURATION.CARD_TO_FIELD)
        this._isAnimating = false
        return
      }
    } else {
      // 無元素且非對手：等待時長
      await sleep(ANIMATION_DURATION.CARD_TO_FIELD)
      this._isAnimating = false
      return
    }

    // 計算目標位置
    let toRect: DOMRect
    if (targetElement) {
      // 有配對：飛到配對場牌位置（稍微偏移避免完全重疊）
      const targetRect = targetElement.getBoundingClientRect()
      toRect = new DOMRect(
        targetRect.x + CARD_OFFSET.X,
        targetRect.y + CARD_OFFSET.Y,
        targetRect.width,
        targetRect.height
      )
    } else if (fieldPosition) {
      // 無配對：飛到場牌區中心
      toRect = new DOMRect(
        fieldPosition.rect.x + fieldPosition.rect.width / 2 - fromRect.width / 2,
        fieldPosition.rect.y + fieldPosition.rect.height / 2 - fromRect.height / 2,
        fromRect.width,
        fromRect.height
      )
    } else {
      toRect = fromRect
    }

    // 隱藏原始卡片（玩家手牌）
    if (cardElement) {
      this.animationLayerStore.hideCards([cardId])
    }

    // 使用動畫層播放克隆卡片動畫（move 類型，不需要淡入）
    await new Promise<void>(resolve => {
      this.animationLayerStore.addCard({
        cardId,
        fromRect,
        toRect,
        onComplete: resolve,
        cardEffectType: 'move',
        isFaceDown,  // 對手牌顯示牌背
      })
    })

    // 動畫完成後：有配對時保持隱藏，無配對時立即顯示
    if (!targetCardId) {
      this.animationLayerStore.showCard(cardId)
    }
    // 有配對時，卡片保持隱藏，由後續動畫處理

    this._isAnimating = false
  }

  async playMatchAnimation(handCardId: string, fieldCardId: string): Promise<{ x: number; y: number } | null> {
    if (this._interrupted) {
      this._interrupted = false
      return null
    }

    this._isAnimating = true

    const fieldCardElement = findCardElement(fieldCardId)

    console.info('[AnimationPort] playMatchAnimation (merge effect)', {
      handCardId,
      fieldCardId,
      hasFieldElement: !!fieldCardElement,
    })

    let fieldPosition: { x: number; y: number } | null = null

    // 使用 AnimationLayer 播放合併特效
    // 手牌已在 playCardToFieldAnimation 中隱藏，場牌保持可見
    if (fieldCardElement && !this._interrupted) {
      const fieldRect = fieldCardElement.getBoundingClientRect()
      fieldPosition = { x: fieldRect.x, y: fieldRect.y }

      // 隱藏場牌，準備用克隆做動畫
      this.animationLayerStore.hideCards([fieldCardId])

      // 手牌和場牌作為一組執行 pulse 效果
      // 手牌克隆稍微偏移避免完全重疊
      const handRect = new DOMRect(
        fieldRect.x + CARD_OFFSET.X,
        fieldRect.y + CARD_OFFSET.Y,
        fieldRect.width,
        fieldRect.height
      )

      // 使用 group 方式執行 pulse，兩張卡片作為整體執行縮放動畫
      // 注意順序：場牌先加入，手牌後加入（z-index 更高，視覺上在上面）
      const pulseCards = [
        {
          cardId: fieldCardId,
          fromRect: fieldRect,
          toRect: fieldRect,
          onComplete: () => {},
        },
        {
          cardId: handCardId,
          fromRect: handRect,
          toRect: handRect,
          onComplete: () => {},
        },
      ]

      await new Promise<void>(resolve => {
        this.animationLayerStore.addGroup({
          groupId: `pulse-${Date.now()}`,
          cards: pulseCards,
          groupEffectType: 'pulse',
          onComplete: resolve,
          boundingBox: calculateBoundingBox([fieldRect, handRect]),
        })
      })

      // 動畫完成後保持隱藏（等待 depository 動畫）
    } else {
      await sleep(ANIMATION_DURATION.MATCH_EFFECT)
    }

    this._isAnimating = false
    return fieldPosition
  }

  async playToDepositoryAnimation(
    cardIds: string[],
    targetType: CardType,
    isOpponent: boolean,
    fromPosition?: { x: number; y: number }
  ): Promise<void> {
    if (this._interrupted) {
      this._interrupted = false
      return
    }

    this._isAnimating = true

    console.info('[AnimationPort] playToDepositoryAnimation', {
      cardIds,
      targetType,
      isOpponent,
      fromPosition,
    })

    // 計算淡出位置
    const cardWidth = 60
    const cardHeight = 90
    let fadeOutRect: DOMRect

    if (fromPosition) {
      // 使用指定的起始位置（配對場牌位置）
      fadeOutRect = new DOMRect(
        fromPosition.x,
        fromPosition.y,
        cardWidth,
        cardHeight
      )
    } else {
      // 備用：使用場牌區中心
      const fieldPosition = this.registry.getPosition('field')
      if (!fieldPosition || this._interrupted) {
        this._isAnimating = false
        return
      }
      fadeOutRect = new DOMRect(
        fieldPosition.rect.x + fieldPosition.rect.width / 2 - cardWidth / 2,
        fieldPosition.rect.y + fieldPosition.rect.height / 2 - cardHeight / 2,
        cardWidth,
        cardHeight
      )
    }

    // 淡出動畫（在配對位置）
    // 注意：captured_cards[0] 是手牌（偏移位置），其餘是場牌（原位）
    // 順序：場牌先加入，手牌後加入（z-index 更高）
    const fadeOutPromises = cardIds.map((cardId, index) => {
      // index=0 是手牌，有偏移 (+8, -8)；其他是場牌，無偏移
      const isHandCard = index === 0
      const offsetRect = new DOMRect(
        fadeOutRect.x + (isHandCard ? 8 : 0),
        fadeOutRect.y + (isHandCard ? -8 : 0),
        fadeOutRect.width,
        fadeOutRect.height
      )
      return {
        cardId,
        rect: offsetRect,
        isHandCard,
      }
    })

    // 場牌先加入，手牌後加入
    const sortedCards = [...fadeOutPromises].sort((a) =>
      a.isHandCard ? 1 : -1
    )

    const animations = sortedCards.map(({ cardId, rect }) => {
      return new Promise<void>(resolve => {
        this.animationLayerStore.addCard({
          cardId,
          fromRect: rect,
          toRect: rect,
          onComplete: resolve,
          cardEffectType: 'fadeOut',
        })
      })
    })

    await Promise.all(animations)

    if (this._interrupted) {
      this._isAnimating = false
      return
    }

    // === 階段 2：等待 DOM 布局完成 ===
    await waitForLayout()

    if (this._interrupted) {
      this._isAnimating = false
      return
    }

    // === 階段 3：查詢獲得區目標位置 ===
    // 在獲得區容器內查找，避免找到場牌區的同 cardId 元素
    const depositoryContainer = document.querySelector(
      isOpponent ? '.opponent-depository-zone' : '.player-depository-zone'
    )

    const cardPositions: { cardId: string; rect: DOMRect }[] = []
    cardIds.forEach(cardId => {
      const cardElement = depositoryContainer?.querySelector(
        `[data-card-id="${cardId}"]`
      ) as HTMLElement | null
      if (cardElement) {
        cardPositions.push({
          cardId,
          rect: cardElement.getBoundingClientRect(),
        })
      }
    })

    console.info('[AnimationPort] playToDepositoryAnimation positions', {
      requested: cardIds.length,
      found: cardPositions.length,
      positions: cardPositions.map(p => ({ cardId: p.cardId, x: p.rect.x, y: p.rect.y })),
    })

    // === 階段 4：創建淡入動畫組（在獲得區位置） ===
    if (cardPositions.length > 0 && !this._interrupted) {
      const fadeInGroupCards = cardPositions.map(({ cardId, rect }) => ({
        cardId: `${cardId}-fadeIn`,
        renderCardId: cardId,  // 用於 CardComponent 渲染
        fromRect: rect,
        toRect: rect,  // group 動畫不需要 toRect
        onComplete: () => {},  // 由 group 統一處理
      }))

      // 使用 addGroup 將多張卡片作為一個整體執行 fadeIn
      const fadeInRects = cardPositions.map(p => p.rect)
      await new Promise<void>(resolve => {
        this.animationLayerStore.addGroup({
          groupId: `fadeIn-${Date.now()}`,
          cards: fadeInGroupCards,
          groupEffectType: 'fadeIn',
          onComplete: resolve,
          boundingBox: calculateBoundingBox(fadeInRects),
        })
      })
    }

    // === 階段 5：動畫完成後顯示真實卡片 ===
    cardIds.forEach(cardId => {
      this.animationLayerStore.showCard(cardId)
    })

    this._isAnimating = false
  }

  async playFlipFromDeckAnimation(cardId: string): Promise<void> {
    // T060: 翻牌階段單張翻牌動畫
    // 從牌堆飛到場牌區（與發牌動畫相同效果）

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
        // A. 先顯示卡片（移除 invisible），但立即設置 opacity: 0
        this.animationLayerStore.showCard(cardId)

        // B. 等待 DOM 布局完成
        await waitForLayout(1)

        // C. 保存原始樣式並設置動畫樣式
        const originalZIndex = cardElement.style.zIndex
        const originalPosition = cardElement.style.position
        cardElement.style.zIndex = '9999'
        cardElement.style.position = 'relative'

        // D. 計算卡片當前位置（DOM 已布局完成）
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
          },
          enter: {
            x: 0,
            y: 0,
            scale: 1,
            opacity: 1,
            transition: {
              type: 'spring',
              stiffness: 250,
              damping: 20,
            },
          },
        })

        await apply('enter')
        await sleep(ANIMATION_DURATION.FLIP_FROM_DECK)

        // E. 清理：恢復原始樣式
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

  /**
   * 中斷所有進行中和等待中的動畫
   *
   * @description
   * 用於緊急情況（斷線重連、快速狀態同步）時立即停止動畫。
   *
   * 執行步驟：
   * 1. 設置中斷 flag（_interrupted = true），阻止新動畫開始
   * 2. 清除動畫狀態 flag（_isAnimating = false），解除操作阻擋
   * 3. 清空 AnimationLayerStore，移除所有動畫卡片
   * 4. 重置中斷 flag（下次檢查時生效）
   *
   * 注意：
   * - 正在播放的 @vueuse/motion 動畫會繼續播放完畢（無法立即停止）
   * - 但不會觸發後續動畫，達到快速恢復的目的
   */
  interrupt(): void {
    this._interrupted = true
    this._isAnimating = false

    // 清空動畫層，移除所有動畫卡片
    this.animationLayerStore.clear()

    // 重置中斷 flag（在下一個事件循環）
    setTimeout(() => {
      this._interrupted = false
    }, 0)

    console.info('[AnimationPort] interrupt - all animations stopped')
  }

  isAnimating(): boolean {
    return this._isAnimating
  }

  clearHiddenCards(): void {
    this.animationLayerStore.clear()
    console.info('[AnimationPort] clearHiddenCards')
  }

  hideCards(cardIds: string[]): void {
    this.animationLayerStore.hideCards(cardIds)
    console.info('[AnimationPort] hideCards', { cardIds })
  }
}

