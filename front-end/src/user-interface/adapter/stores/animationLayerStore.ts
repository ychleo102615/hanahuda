/**
 * Animation Layer Store
 *
 * @description
 * 管理動畫層中正在執行動畫的卡片狀態。
 * 用於跨容器動畫，避免 overflow 裁切問題。
 */

import { ref } from 'vue'
import { defineStore } from 'pinia'

/**
 * 動畫卡片資料
 */
export interface AnimatingCard {
  /** 卡片 ID */
  cardId: string
  /** 起始位置（牌堆） */
  fromRect: DOMRect
  /** 目標位置（最終位置） */
  toRect: DOMRect
  /** 動畫完成回調 */
  onComplete: () => void
  /** 是否顯示牌背（用於對手手牌） */
  isFaceDown?: boolean
}

/**
 * Animation Layer Store
 */
export const useAnimationLayerStore = defineStore('animationLayer', () => {
  // State
  const animatingCards = ref<AnimatingCard[]>([])
  const hiddenCardIds = ref<Set<string>>(new Set())

  // Actions - 動畫卡片管理
  function addCard(card: AnimatingCard): void {
    animatingCards.value.push(card)
  }

  function removeCard(cardId: string): void {
    animatingCards.value = animatingCards.value.filter(c => c.cardId !== cardId)
  }

  function clear(): void {
    animatingCards.value = []
    hiddenCardIds.value.clear()
  }

  // Actions - 卡片隱藏管理
  function hideCards(cardIds: string[]): void {
    cardIds.forEach(id => hiddenCardIds.value.add(id))
  }

  function showCard(cardId: string): void {
    hiddenCardIds.value.delete(cardId)
  }

  function isCardHidden(cardId: string): boolean {
    return hiddenCardIds.value.has(cardId)
  }

  return {
    // State
    animatingCards,
    hiddenCardIds,
    // Actions
    addCard,
    removeCard,
    clear,
    hideCards,
    showCard,
    isCardHidden,
  }
})

export type AnimationLayerStore = ReturnType<typeof useAnimationLayerStore>
