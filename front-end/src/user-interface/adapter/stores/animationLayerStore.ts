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
 * 卡片效果類型
 */
export type CardEffectType =
  | 'deal'      // 發牌：移動 + 淡入
  | 'move'      // 移動：只移動，不淡入淡出
  | 'pulse'     // 脈衝：原地縮放效果
  | 'fadeOut'   // 淡出：淡出消失
  | 'fadeIn'    // 淡入：淡入出現

/**
 * 組級效果類型（用於多張卡片整體動畫）
 */
export type GroupEffectType = 'fadeOut' | 'fadeIn' | 'pulse'

/**
 * 動畫卡片資料
 */
export interface AnimatingCard {
  /** 動畫識別 ID（用於追蹤動畫狀態，可帶後綴如 -fadeOut） */
  cardId: string
  /** 顯示用卡片 ID（用於 CardComponent 渲染卡片圖案，預設使用 cardId） */
  displayCardId?: string
  /** 起始位置（牌堆） */
  fromRect: DOMRect
  /** 目標位置（最終位置） */
  toRect: DOMRect
  /** 動畫完成回調 */
  onComplete: () => void
  /** 是否顯示牌背（用於對手手牌） */
  isFaceDown?: boolean
  /** 卡片效果類型（預設 'deal'） */
  cardEffectType?: CardEffectType
}

/**
 * 卡片組資料（用於多張卡片整體動畫）
 *
 * @description
 * 將多張需要一起執行動畫的卡片包裹在同一容器中。
 * 容器定位到包圍盒（bounding box），內層卡片使用相對座標。
 * 這樣可以：
 * 1. 避免透明度穿透（fadeOut/fadeIn）
 * 2. 正確的 transform-origin（pulse）
 */
export interface CardGroup {
  /** 組識別 ID */
  groupId: string
  /** 組內的卡片列表 */
  cards: AnimatingCard[]
  /** 組級效果類型 */
  groupEffectType: GroupEffectType
  /** 動畫完成回調 */
  onComplete: () => void
  /** 包圍盒：所有卡片的最小外接矩形 */
  boundingBox: DOMRect
}

/**
 * Animation Layer Store
 */
export const useAnimationLayerStore = defineStore('animationLayer', () => {
  // State
  const animatingCards = ref<AnimatingCard[]>([])
  const animatingGroups = ref<CardGroup[]>([])
  const hiddenCardIds = ref<Set<string>>(new Set())

  // Actions - 動畫卡片管理
  function addCard(card: AnimatingCard): void {
    animatingCards.value.push(card)
  }

  function removeCard(cardId: string): void {
    animatingCards.value = animatingCards.value.filter(c => c.cardId !== cardId)
  }

  // Actions - 動畫卡片組管理
  function addGroup(group: CardGroup): void {
    animatingGroups.value.push(group)
  }

  function removeGroup(groupId: string): void {
    animatingGroups.value = animatingGroups.value.filter(g => g.groupId !== groupId)
  }

  function clear(): void {
    animatingCards.value = []
    animatingGroups.value = []
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
    animatingGroups,
    hiddenCardIds,
    // Actions - 卡片管理
    addCard,
    removeCard,
    // Actions - 卡片組管理
    addGroup,
    removeGroup,
    // Actions - 通用
    clear,
    hideCards,
    showCard,
    isCardHidden,
  }
})

export type AnimationLayerStore = ReturnType<typeof useAnimationLayerStore>
