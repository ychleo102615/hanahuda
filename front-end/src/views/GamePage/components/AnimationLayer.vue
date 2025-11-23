<script setup lang="ts">
/**
 * AnimationLayer - 全域動畫層組件
 *
 * @description
 * 渲染正在執行動畫的卡片，使用 fixed positioning 避免 overflow 裁切。
 * 透過 Teleport 將動畫層放到 body，確保在最上層。
 */

import { watch, ref, nextTick } from 'vue'
import { useAnimationLayerStore } from '@/user-interface/adapter/stores'
import CardComponent from './CardComponent.vue'
import { useMotion } from '@vueuse/motion'

const store = useAnimationLayerStore()

// 追蹤已經開始動畫的卡片 ID
const animatedCardIds = ref<Set<string>>(new Set())

// 追蹤每張卡片的 DOM 元素
const cardRefs = ref<Map<string, HTMLElement>>(new Map())

// 設置卡片 ref
function setCardRef(cardId: string, el: HTMLElement | null) {
  if (el) {
    cardRefs.value.set(cardId, el)
    // 當元素掛載時，立即檢查是否需要開始動畫
    startAnimationIfNeeded(cardId)
  } else {
    cardRefs.value.delete(cardId)
  }
}

// 為指定卡片開始動畫
function startAnimationIfNeeded(cardId: string) {
  // 如果已經在動畫中，跳過
  if (animatedCardIds.value.has(cardId)) return

  const card = store.animatingCards.find(c => c.cardId === cardId)
  if (!card) return

  const el = cardRefs.value.get(cardId)
  if (!el) return

  // 標記為已開始動畫
  animatedCardIds.value.add(cardId)

  // 計算 scale 比例：從牌堆大小到目標大小
  const scaleRatio = card.toRect.width / card.fromRect.width

  // 計算位移：從 fromRect 到 toRect（左上角基準）
  const deltaX = card.toRect.x - card.fromRect.x
  const deltaY = card.toRect.y - card.fromRect.y

  // 設置 transform-origin 為左上角
  el.style.transformOrigin = '0 0'

  // 執行動畫
  const { apply } = useMotion(el, {
    initial: {
      x: 0,
      y: 0,
      scale: 1,
      opacity: 0,
    },
    enter: {
      x: deltaX,
      y: deltaY,
      scale: scaleRatio,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 25,
      },
    },
  })

  // 執行動畫並等待完成
  apply('enter')?.then(() => {
    card.onComplete()
    store.removeCard(card.cardId)
    animatedCardIds.value.delete(cardId)
  })
}

</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 pointer-events-none" style="z-index: 9999;">
      <div
        v-for="card in store.animatingCards"
        :key="card.cardId"
        :ref="(el) => setCardRef(card.cardId, el as HTMLElement)"
        class="absolute"
        :style="{
          left: `${card.fromRect.x}px`,
          top: `${card.fromRect.y}px`,
          width: `${card.fromRect.width}px`,
          height: `${card.fromRect.height}px`,
        }"
      >
        <CardComponent
          :card-id="card.cardId"
          :is-animation-clone="true"
        />
      </div>
    </div>
  </Teleport>
</template>
