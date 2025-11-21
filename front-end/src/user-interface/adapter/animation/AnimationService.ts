/**
 * AnimationService - 動畫服務
 *
 * @description
 * 實作 TriggerUIEffectPort.triggerAnimation 方法，
 * 管理動畫佇列，支援動畫中斷。
 * 使用 @vueuse/motion 實現流暢的卡片移動動畫。
 */

import type { Animation, AnimationParams, DealCardsParams, CardMoveParams, ZoneName } from './types'
import type { AnimationType } from './types'
import type { AnimationParams as AppAnimationParams, AnimationType as AppAnimationType } from '../../application/ports/output/trigger-ui-effect.port'
import { AnimationQueue, InterruptedError } from './AnimationQueue'
import { useMotion } from '@vueuse/motion'

/**
 * 輔助函數：等待指定時間
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 動畫服務
 */
export class AnimationService {
  private queue: AnimationQueue

  constructor() {
    this.queue = new AnimationQueue()
    this.queue.setExecutor(this.executeAnimation.bind(this))
  }

  /**
   * 觸發動畫
   *
   * @param type - 動畫類型
   * @param params - 動畫參數 (Application Layer 格式)
   * @returns Promise 在動畫完成後 resolve
   */
  trigger<T extends AppAnimationType>(
    type: T,
    params: AppAnimationParams<T>
  ): Promise<void> {
    // 將 Application Layer 參數轉換為 Adapter Layer 參數
    const adapterParams = this.convertParams(type, params)

    // 只處理 Adapter Layer 支援的動畫類型
    const adapterType = type as AnimationType

    const animation: Animation = {
      id: crypto.randomUUID(),
      type: adapterType,
      params: adapterParams,
      status: 'pending',
    }

    return new Promise((resolve, reject) => {
      animation.callback = () => {
        if (animation.status === 'completed') {
          resolve()
        } else if (animation.status === 'interrupted') {
          reject(new InterruptedError())
        }
      }

      this.queue.enqueue(animation)
    })
  }

  /**
   * 將 Application Layer 參數轉換為 Adapter Layer 參數
   */
  private convertParams<T extends AppAnimationType>(
    type: T,
    params: AppAnimationParams<T>
  ): AnimationParams {
    if (type === 'DEAL_CARDS') {
      const appParams = params as AppAnimationParams<'DEAL_CARDS'>
      // 將 fieldCards 和 hands 轉換為 cards 數組
      const cards: Array<{ cardId: string; targetZone: ZoneName; targetIndex: number }> = []

      // 場牌
      if (appParams.fieldCards) {
        appParams.fieldCards.forEach((cardId, index) => {
          cards.push({ cardId, targetZone: 'field', targetIndex: index })
        })
      }

      // 手牌
      if (appParams.hands) {
        appParams.hands.forEach(hand => {
          const zone: ZoneName = hand.player_id === 'player-1' ? 'player-hand' : 'opponent-hand'
          hand.cards.forEach((cardId, index) => {
            cards.push({ cardId, targetZone: zone, targetIndex: index })
          })
        })
      }

      return {
        cards,
        delay: 100,
        duration: 300,
      } as DealCardsParams
    }

    if (type === 'CARD_MOVE') {
      const appParams = params as AppAnimationParams<'CARD_MOVE'>
      // CARD_MOVE 需要位置資訊，暫時使用預設值
      return {
        cardId: appParams.cardId,
        from: { x: 0, y: 0 },
        to: { x: 0, y: 0 },
        duration: 300,
      } as CardMoveParams
    }

    // 其他類型暫時直接返回（YAKU_EFFECT, SCORE_UPDATE 尚未實作）
    return params as unknown as AnimationParams
  }

  /**
   * 中斷所有動畫
   */
  interrupt(): void {
    this.queue.interrupt()
  }

  /**
   * 執行單個動畫
   *
   * @param animation - 要執行的動畫
   */
  private async executeAnimation(animation: Animation): Promise<void> {
    animation.status = 'running'

    switch (animation.type) {
      case 'DEAL_CARDS':
        await this.executeDealCards(animation.params as DealCardsParams)
        break
      case 'CARD_MOVE':
        await this.executeCardMove(animation.params as CardMoveParams)
        break
      default:
        console.warn('[AnimationService] Unknown animation type:', animation.type)
    }
  }

  /**
   * 執行發牌動畫
   *
   * @param params - 發牌動畫參數
   */
  private async executeDealCards(params: DealCardsParams): Promise<void> {
    const { cards, delay = 100, duration = 300 } = params

    // 防禦性檢查：如果沒有 cards，跳過動畫
    if (!cards || cards.length === 0) {
      console.info('[AnimationService] DEAL_CARDS: No cards, skipping animation')
      return
    }

    // 依序發牌到各區域
    for (const [i, card] of cards.entries()) {
      // 延遲
      if (i > 0) {
        await sleep(delay)
      }

      // 觸發單張牌的發牌動畫
      // 實際的視覺效果由組件的 Vue Transition 處理
      // 這裡只處理時序
      console.info('[AnimationService] Deal card', card.cardId, 'to', card.targetZone, 'at index', card.targetIndex)
    }

    // 等待最後一張牌的動畫完成
    await sleep(duration)
  }

  /**
   * 執行卡片移動動畫
   *
   * @param params - 卡片移動動畫參數
   */
  private async executeCardMove(params: CardMoveParams): Promise<void> {
    const { cardId, from, to, duration } = params

    // 查找卡片元素
    const cardElement = document.querySelector(`[data-card-id="${cardId}"]`) as HTMLElement

    if (!cardElement) {
      console.warn('[AnimationService] Card element not found:', cardId)
      return
    }

    // 計算移動距離
    const deltaX = to.x - from.x
    const deltaY = to.y - from.y

    // 使用 @vueuse/motion 實現動畫
    const { apply } = useMotion(cardElement, {
      initial: {
        x: 0,
        y: 0,
      },
      enter: {
        x: deltaX,
        y: deltaY,
        transition: {
          type: 'spring',
          stiffness: 200,
          damping: 20,
          mass: 1,
        },
      },
    })

    // 應用動畫
    await apply('enter')

    // 等待動畫穩定
    await sleep(duration)

    // 清理樣式（讓組件自己管理最終位置）
    cardElement.style.transform = ''
  }
}

// 導出單例（供 DI Container 使用）
export const animationService = new AnimationService()
