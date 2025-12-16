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

import type {
  AnimationPort,
  DealAnimationParams,
  CardPlayAnimationParams,
  CardPlayAnimationResult,
  CardPlayStateCallbacks,
  DrawCardAnimationParams,
} from '../../application/ports/output/animation.port'
import type { CardType } from '../../domain/types'
import { zoneRegistry, type ZoneRegistry } from './ZoneRegistry'
import type { ZoneName } from './types'
import type { AnimationLayerStore } from '../stores'
import type { useUIStateStore } from '../stores/uiState'
import { delay, waitForLayout, type OperationSessionManager } from '../abort'
// AbortOperationError 用於類型檢查（在 catch 中辨識）
// 注意：不在此處捕獲，讓錯誤自然傳遞到 Use Case

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
  private operationSession: OperationSessionManager
  private uiStateStore: ReturnType<typeof useUIStateStore>

  constructor(
    registry: ZoneRegistry,
    animationLayerStore: AnimationLayerStore,
    operationSession: OperationSessionManager,
    uiStateStore: ReturnType<typeof useUIStateStore>
  ) {
    this.registry = registry
    this.animationLayerStore = animationLayerStore
    this.operationSession = operationSession
    this.uiStateStore = uiStateStore
  }

  // ===== 動畫方法 =====
  // 注意：所有動畫方法使用 AbortableDelay 並傳入 signal
  // 當 OperationSessionManager.abortAll() 被呼叫時，AbortOperationError 會自然傳遞到調用的 Use Case
  // Use Case 的 try-catch 會捕獲此錯誤並靜默結束，中斷後續邏輯執行

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
    await waitForLayout(2, this.operationSession.getSignal())

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
                const cardElement = this.registry.findCard(cardId, 'player-hand')

                if (cardElement && deckPosition && !this._interrupted) {
                  params.onCardDealt?.()
                  this.animateSingleDealCard(cardElement, deckPosition.rect)
                  await delay(ANIMATION_DURATION.DEAL_CARD, this.operationSession.getSignal())
                }
                playerCardIndex++
              }
            } else {
              // 發對手手牌
              if (opponentCardIndex < params.opponentHandCount) {
                if (deckPosition && !this._interrupted) {
                  params.onCardDealt?.()
                  this.animateOpponentDealCard(opponentCardIndex, deckPosition.rect)
                  await delay(ANIMATION_DURATION.DEAL_CARD, this.operationSession.getSignal())
                }
                opponentCardIndex++
              }
            }

            // 每張牌延遲
            await delay(ANIMATION_DURATION.DEAL_STAGGER, this.operationSession.getSignal())
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
        const cardElement = this.registry.findCard(cardId, 'field')

        if (cardElement && deckPosition && !this._interrupted) {
          params.onCardDealt?.()
          this.animateSingleDealCard(cardElement, deckPosition.rect)
          await delay(ANIMATION_DURATION.DEAL_CARD, this.operationSession.getSignal())
        }

        // 每張牌延遲（最後一張不需要）
        if (i < params.fieldCards.length - 1) {
          await delay(ANIMATION_DURATION.DEAL_STAGGER, this.operationSession.getSignal())
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
    await waitForLayout(3, this.operationSession.getSignal())

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

    // 根據情況查找卡片元素（優先在預期的 zone 中查找）
    let cardElement = this.registry.findCard(cardId, isOpponent ? 'opponent-hand' : 'player-hand')

    // 如果在手牌區找不到，嘗試在場牌區查找（用於翻牌飛向配對目標的情況）
    if (!cardElement) {
      cardElement = this.registry.findCard(cardId, 'field')
    }

    // 配對目標一定在場牌區
    const targetElement = targetCardId ? this.registry.findCard(targetCardId, 'field') : null
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

    // 無配對情況：明確從手牌區查找
    const isNoMatchCase = !targetCardId

    if (isNoMatchCase) {
      // 根據 isOpponent 決定查找哪個手牌區
      const handZone = isOpponent ? 'opponent-hand' : 'player-hand'
      const handCardElement = this.registry.findCardInZone(handZone, cardId)

      if (handCardElement) {
        fromRect = handCardElement.getBoundingClientRect()
      } else if (isOpponent) {
        // 對手沒有真正手牌元素，使用手牌區中心作為 fallback（參考發牌動畫作法）
        // 注意：必須在 cardElement 之前判斷，因為 cardElement 可能是場牌區的元素
        const opponentHandPosition = this.registry.getPosition('opponent-hand')
        if (opponentHandPosition) {
          fromRect = new DOMRect(
            opponentHandPosition.rect.x + opponentHandPosition.rect.width / 2 - cardWidth / 2,
            opponentHandPosition.rect.y + opponentHandPosition.rect.height / 2 - cardHeight / 2,
            cardWidth,
            cardHeight
          )
        } else {
          await delay(ANIMATION_DURATION.CARD_TO_FIELD, this.operationSession.getSignal())
          this._isAnimating = false
          return
        }
      } else if (cardElement) {
        // 玩家 Fallback: 使用之前找到的元素（可能在其他 zone）
        fromRect = cardElement.getBoundingClientRect()
      } else {
        // 玩家無元素：等待時長
        await delay(ANIMATION_DURATION.CARD_TO_FIELD, this.operationSession.getSignal())
        this._isAnimating = false
        return
      }
    } else if (cardElement) {
      // 有配對或其他情況：使用真實 DOM 位置
      fromRect = cardElement.getBoundingClientRect()
    } else if (isOpponent) {
      // 對手手牌：從對手手牌區位置開始
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
        await delay(ANIMATION_DURATION.CARD_TO_FIELD, this.operationSession.getSignal())
        this._isAnimating = false
        return
      }
    } else {
      // 無元素且非對手：等待時長
      await delay(ANIMATION_DURATION.CARD_TO_FIELD, this.operationSession.getSignal())
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
    } else {
      // 無配對：明確從場牌區查找
      let fieldCardElement = this.registry.findCardInZone('field', cardId)

      // 如果找不到，等待 DOM 更新後重試（Vue 響應式更新可能還在進行中）
      if (!fieldCardElement) {
        await waitForLayout(3, this.operationSession.getSignal())
        fieldCardElement = this.registry.findCardInZone('field', cardId)
      }

      if (fieldCardElement) {
        // 找到場牌區的新增位置 → 飛到該位置
        const fieldCardRect = fieldCardElement.getBoundingClientRect()
        toRect = new DOMRect(
          fieldCardRect.x,
          fieldCardRect.y,
          fieldCardRect.width,
          fieldCardRect.height
        )
      } else if (fieldPosition) {
        // 場牌區沒有該卡片 → 飛到場牌區中心（備用方案）
        console.warn('[AnimationPort] 場牌區找不到卡片，使用中心位置', { cardId })
        toRect = new DOMRect(
          fieldPosition.rect.x + fieldPosition.rect.width / 2 - fromRect.width / 2,
          fieldPosition.rect.y + fieldPosition.rect.height / 2 - fromRect.height / 2,
          fromRect.width,
          fromRect.height
        )
      } else {
        toRect = fromRect
      }
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

    // 配對時場牌在 field zone
    const fieldCardElement = this.registry.findCard(fieldCardId, 'field')

    console.info('[AnimationPort] playMatchAnimation (merge effect)', {
      handCardId,
      fieldCardId,
      hasFieldElement: !!fieldCardElement,
    })
    console.trace()

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
      await delay(ANIMATION_DURATION.MATCH_EFFECT, this.operationSession.getSignal())
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

    const fadeOutAnimations = sortedCards.map(({ cardId, rect }) => {
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

    // 啟動淡出動畫（不等待完成）
    const fadeOutPromise = Promise.all(fadeOutAnimations)

    if (this._interrupted) {
      this._isAnimating = false
      return
    }

    // === 階段 2：等待 DOM 布局完成 ===
    await waitForLayout(2, this.operationSession.getSignal())

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

    // === 階段 4：創建淡入動畫組（在獲得區位置）並同時等待淡出淡入完成 ===
    let fadeInPromise: Promise<void> = Promise.resolve()

    if (cardPositions.length > 0 && !this._interrupted) {
      const fadeInGroupCards = cardPositions.map(({ cardId, rect }) => ({
        cardId: `${cardId}-fadeIn`,
        renderCardId: cardId,  // 用於 CardComponent 渲染
        fromRect: rect,
        toRect: rect,  // group 動畫不需要 toRect
        onComplete: () => {},  // 由 group 統一處理
      }))

      // 使用 addGroup 將多張卡片作為一個整體執行 fadeIn（不等待完成）
      const fadeInRects = cardPositions.map(p => p.rect)
      fadeInPromise = new Promise<void>(resolve => {
        this.animationLayerStore.addGroup({
          groupId: `fadeIn-${Date.now()}`,
          cards: fadeInGroupCards,
          groupEffectType: 'fadeIn',
          onComplete: resolve,
          boundingBox: calculateBoundingBox(fadeInRects),
        })
      })
    }

    // 同時等待淡出和淡入動畫完成
    await Promise.all([fadeOutPromise, fadeInPromise])

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
    // 翻牌後卡片在 field zone
    const cardElement = this.registry.findCard(cardId, 'field')

    console.info('[AnimationPort] playFlipFromDeckAnimation', {
      cardId,
      deck: deckPosition ? 'found' : 'not registered',
      hasElement: !!cardElement,
    })

    try {
      if (cardElement && deckPosition && !this._interrupted) {
        // 隱藏原始卡片，準備動畫
        this.animationLayerStore.hideCards([cardId])

        // 等待 DOM 布局完成
        await waitForLayout(2, this.operationSession.getSignal())

        // 取得目標位置
        const cardRect = cardElement.getBoundingClientRect()

        // 通過 AnimationLayer 播放動畫（'deal' 效果：從 opacity 0 開始，移動 + 淡入）
        await new Promise<void>(resolve => {
          this.animationLayerStore.addCard({
            cardId,
            fromRect: deckPosition.rect,
            toRect: cardRect,
            onComplete: resolve,
          })
        })

        // 動畫完成後顯示原始卡片
        this.animationLayerStore.showCard(cardId)
      } else {
        // 無元素時等待時長
        if (!this._interrupted) {
          await delay(ANIMATION_DURATION.FLIP_FROM_DECK, this.operationSession.getSignal())
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
   * 3. 清空 AnimationLayerStore，移除所有動畫卡片（DOM 元素會被 Vue 移除）
   * 4. 重置中斷 flag（下次檢查時生效）
   *
   * 動畫停止機制：
   * - 當 AnimationLayerStore.clear() 被呼叫，animatingCards 陣列被清空
   * - Vue 的響應式系統會移除對應的 DOM 元素
   * - DOM 元素移除後，CSS transition/animation 立即停止
   * - @vueuse/motion 的 Promise 回調可能仍會執行，但因 DOM 已移除而無視覺影響
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

  async waitForReady(requiredZones: string[], timeoutMs = 3000): Promise<void> {
    const intervalMs = 50
    let waited = 0

    console.info('[AnimationPort] waitForReady', { requiredZones, timeoutMs })

    while (waited < timeoutMs) {
      // 檢查所有必要的 zone 是否已註冊
      const allReady = requiredZones.every(zone =>
        this.registry.getPosition(zone as ZoneName) !== null
      )

      if (allReady) {
        console.info('[AnimationPort] All zones ready', { requiredZones, waitedMs: waited })
        return
      }

      await delay(intervalMs, this.operationSession.getSignal())
      waited += intervalMs
    }

    console.warn('[AnimationPort] waitForReady timeout', { requiredZones, waited, timeoutMs })
  }

  // ===== 高階動畫方法（封裝完整動畫序列）=====

  /**
   * 播放完整的手牌操作動畫序列
   *
   * @description
   * 根據 params 自動判斷並執行有配對/無配對的完整動畫流程。
   * 封裝所有動畫時序，解決閃爍問題。
   */
  async playCardPlaySequence(
    params: CardPlayAnimationParams,
    callbacks: CardPlayStateCallbacks
  ): Promise<CardPlayAnimationResult> {
    const { playedCard, matchedCard, capturedCards, isOpponent, targetCardType } = params
    const hasMatch = matchedCard !== null

    // 在整個序列期間保持 _isAnimating = true，避免子動畫之間的空隙導致 isAnimating() 返回 false
    this._isAnimating = true

    // 動畫開始前清除懸浮預覽高亮，確保出牌後場牌不再顯示高亮提示
    this.uiStateStore.clearHandCardHoverPreview()

    console.info('[AnimationPort] playCardPlaySequence', {
      playedCard,
      matchedCard,
      hasMatch,
      capturedCards: [...capturedCards],
      isOpponent,
    })

    try {
      if (hasMatch) {
        // === 有配對流程 ===
        // 1. 手牌飛向配對場牌
        await this.playCardToFieldAnimation(playedCard, isOpponent, matchedCard)
        this._isAnimating = true // 子動畫結束會設為 false，重新設為 true

        // 2. 執行配對動畫（pulse → fadeOut）並同時更新獲得區
        const matchPosition = await this.playMatchAndDepositorySequence(
          playedCard,
          matchedCard,
          [...capturedCards],
          targetCardType,
          isOpponent,
          callbacks,
          false // 手牌：從手牌區移除
        )

        return { hasMatch: true, matchPosition }
      } else {
        // === 無配對流程 ===
        // 1. 預先隱藏手牌
        this.hideCards([playedCard])

        // 2. 新增場牌 DOM
        callbacks.onAddFieldCards([playedCard])

        // 3. 等待 DOM 布局
        await delay(50, this.operationSession.getSignal())

        // 4. 播放動畫
        await this.playCardToFieldAnimation(playedCard, isOpponent, undefined)

        // 5. 移除手牌 DOM
        callbacks.onRemoveHandCard(playedCard)

        return { hasMatch: false, matchPosition: null }
      }
    } finally {
      this._isAnimating = false
    }
  }

  /**
   * 播放完整的翻牌動畫序列
   *
   * @description
   * 執行從牌堆翻牌並處理可能的配對。
   */
  async playDrawCardSequence(
    params: DrawCardAnimationParams,
    callbacks: CardPlayStateCallbacks
  ): Promise<CardPlayAnimationResult> {
    const { drawnCard, matchedCard, capturedCards, isOpponent, targetCardType } = params
    const hasMatch = matchedCard !== null

    // 在整個序列期間保持 _isAnimating = true，避免子動畫之間的空隙導致 isAnimating() 返回 false
    this._isAnimating = true

    // 動畫開始前清除懸浮預覽高亮，確保翻牌時場牌不再顯示高亮提示
    this.uiStateStore.clearHandCardHoverPreview()

    console.info('[AnimationPort] playDrawCardSequence', {
      drawnCard,
      matchedCard,
      hasMatch,
      capturedCards: [...capturedCards],
      isOpponent,
    })

    try {
      // 1. 預先隱藏翻牌（會在場牌區渲染）
      this.hideCards([drawnCard])

      // 2. 新增場牌 DOM（翻牌總是先加入場牌）
      callbacks.onAddFieldCards([drawnCard])

      // 3. 等待 DOM 布局
      await delay(50, this.operationSession.getSignal())

      // 4. 播放翻牌動畫
      await this.playFlipFromDeckAnimation(drawnCard)
      this._isAnimating = true // 子動畫結束會設為 false，重新設為 true

      if (hasMatch) {
        // === 有配對流程 ===
        // 5. 翻牌飛向配對目標
        await this.playCardToFieldAnimation(drawnCard, isOpponent, matchedCard)
        this._isAnimating = true // 子動畫結束會設為 false，重新設為 true

        // 6. 執行配對動畫（pulse → fadeOut）並同時更新獲得區
        const matchPosition = await this.playMatchAndDepositorySequence(
          drawnCard,
          matchedCard,
          [...capturedCards],
          targetCardType,
          isOpponent,
          callbacks,
          true // 翻牌：從場牌區移除（包括翻出的牌本身）
        )

        return { hasMatch: true, matchPosition }
      } else {
        // === 無配對流程 ===
        // 翻牌已在場上，不需要額外處理
        // 但需要從「新增的場牌」中移除（因為它現在是正式的場牌了）
        // 注意：這裡不調用 onRemoveFieldCards，因為牌應該留在場上
        return { hasMatch: false, matchPosition: null }
      }
    } finally {
      this._isAnimating = false
    }
  }

  /**
   * 播放配對動畫並轉移到獲得區
   *
   * @description
   * 使用 pulseToFadeOut 效果實現無縫動畫銜接，解決閃爍問題。
   * 在 pulse 完成後、fadeOut 開始時同步更新獲得區 DOM 並播放淡入動畫，
   * 確保 fadeOut 與 fadeIn 同時執行，語意正確（場牌淡出 = 獲得區淡入）。
   *
   * @param playedCardId - 打出或翻出的牌
   * @param fieldCardId - 被配對的場牌
   * @param isDrawnCard - 是否為翻牌（影響移除邏輯：翻牌從場牌區移除，手牌從手牌區移除）
   *
   * @private
   */
  private async playMatchAndDepositorySequence(
    playedCardId: string,
    fieldCardId: string,
    capturedCards: string[],
    targetType: CardType,
    isOpponent: boolean,
    callbacks: CardPlayStateCallbacks,
    isDrawnCard: boolean
  ): Promise<{ x: number; y: number } | null> {
    // 1. 判斷是否為 TRIPLE_MATCH（4 張牌）
    const isTripleMatch = capturedCards.length === 4

    // 2. 獲取主要配對場牌位置
    const fieldCardElement = this.registry.findCard(fieldCardId, 'field')
    if (!fieldCardElement) {
      console.warn('[AnimationPort] playMatchAndDepositorySequence: field card not found', { fieldCardId })
      return null
    }
    const fieldRect = fieldCardElement.getBoundingClientRect()
    const matchPosition = { x: fieldRect.x, y: fieldRect.y }

    // 3. 獲取額外場牌及其位置（TRIPLE_MATCH 時）
    const additionalFieldCardIds = isTripleMatch
      ? capturedCards.filter(id => id !== playedCardId && id !== fieldCardId)
      : []

    // 收集額外場牌及其位置（只保留找得到元素的）
    const additionalCardsWithRects: Array<{ cardId: string; rect: DOMRect }> = []
    for (const cardId of additionalFieldCardIds) {
      const element = this.registry.findCard(cardId, 'field')
      if (element) {
        additionalCardsWithRects.push({ cardId, rect: element.getBoundingClientRect() })
      } else {
        console.warn('[AnimationPort] playMatchAndDepositorySequence: additional field card not found', { cardId })
      }
    }

    // 4. 隱藏所有相關場牌（手牌已被 playCardToFieldAnimation 隱藏）
    const additionalFieldCards = additionalCardsWithRects.map(c => c.cardId)
    this.animationLayerStore.hideCards([fieldCardId, ...additionalFieldCards])

    // 5. 計算打出牌的偏移位置
    const playedCardRect = new DOMRect(
      fieldRect.x + CARD_OFFSET.X,
      fieldRect.y + CARD_OFFSET.Y,
      fieldRect.width,
      fieldRect.height
    )

    // 6. 準備 fadeIn 動畫的 deferred promise
    // fadeIn 動畫會在 onPulseComplete 回調中創建
    let fadeInResolve: () => void
    const fadeInPromise = new Promise<void>(resolve => {
      fadeInResolve = resolve
    })

    // 7. 構建動畫卡片列表
    const animationCards = [
      {
        cardId: fieldCardId,
        fromRect: fieldRect,
        toRect: fieldRect,
        onComplete: () => {},
      },
      {
        cardId: playedCardId,
        fromRect: playedCardRect,
        toRect: playedCardRect,
        onComplete: () => {},
      },
      // TRIPLE_MATCH 時加入額外的場牌
      ...additionalCardsWithRects.map(({ cardId, rect }) => ({
        cardId,
        fromRect: rect,
        toRect: rect,
        onComplete: () => {},
      })),
    ]

    const additionalRects = additionalCardsWithRects.map(c => c.rect)
    const allRects = [fieldRect, playedCardRect, ...additionalRects]

    // 8. 創建 pulseToFadeOut 動畫組
    // 使用 onPulseComplete 回調在正確時機更新獲得區
    const pulseToFadeOutPromise = new Promise<void>(resolve => {
      this.animationLayerStore.addGroup({
        groupId: `match-fade-${Date.now()}`,
        cards: animationCards,
        groupEffectType: 'pulseToFadeOut',
        onComplete: resolve,
        boundingBox: calculateBoundingBox(allRects),
        // pulse 完成後、fadeOut 開始前的回調
        onPulseComplete: () => {
          this.startDepositoryFadeIn(
            capturedCards,
            isOpponent,
            callbacks,
            fadeInResolve
          )
        },
      })
    })

    // 9. 等待所有動畫完成
    await Promise.all([pulseToFadeOutPromise, fadeInPromise])

    // 10. 顯示獲得區的真實卡片
    capturedCards.forEach(cardId => {
      this.animationLayerStore.showCard(cardId)
    })

    // 11. 移除場牌和手牌 DOM
    if (isDrawnCard) {
      // 翻牌情況：所有 capturedCards 都在場牌區（包括翻出的牌）
      callbacks.onRemoveFieldCards([...capturedCards])
    } else {
      // 手牌情況：手牌從手牌區移除，其他從場牌區移除
      const fieldCardsToRemove = capturedCards.filter(id => id !== playedCardId)
      callbacks.onRemoveFieldCards(fieldCardsToRemove)
      callbacks.onRemoveHandCard(playedCardId)
    }

    // 12. 等待 FLIP 動畫
    await delay(350, this.operationSession.getSignal())

    return matchPosition
  }

  /**
   * 啟動獲得區淡入動畫
   *
   * @description
   * 在 pulse 完成後、fadeOut 開始時調用。
   * 更新獲得區 DOM 並創建 fadeIn 動畫，與 fadeOut 同步執行。
   *
   * @private
   */
  private startDepositoryFadeIn(
    capturedCards: string[],
    isOpponent: boolean,
    callbacks: CardPlayStateCallbacks,
    onComplete: () => void
  ): void {
    // 1. 預先隱藏即將出現在獲得區的卡片
    this.animationLayerStore.hideCards([...capturedCards])

    // 2. 更新獲得區 DOM
    callbacks.onUpdateDepository([...capturedCards])

    // 3. 使用 requestAnimationFrame 等待 DOM 布局後創建 fadeIn 動畫
    // 注意：這裡不能用 await，因為 onPulseComplete 是同步回調
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // 4. 查詢獲得區目標位置
        const depositoryContainer = document.querySelector(
          isOpponent ? '.opponent-depository-zone' : '.player-depository-zone'
        )

        const cardPositions: { cardId: string; rect: DOMRect }[] = []
        capturedCards.forEach(cardId => {
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

        // 5. 創建淡入動畫組
        if (cardPositions.length > 0) {
          const fadeInGroupCards = cardPositions.map(({ cardId, rect }) => ({
            cardId: `${cardId}-fadeIn`,
            renderCardId: cardId,
            fromRect: rect,
            toRect: rect,
            onComplete: () => {},
          }))

          const fadeInRects = cardPositions.map(p => p.rect)
          this.animationLayerStore.addGroup({
            groupId: `fadeIn-${Date.now()}`,
            cards: fadeInGroupCards,
            groupEffectType: 'fadeIn',
            onComplete,
            boundingBox: calculateBoundingBox(fadeInRects),
          })
        } else {
          // 沒有卡片需要淡入，直接完成
          onComplete()
        }
      })
    })
  }
}

