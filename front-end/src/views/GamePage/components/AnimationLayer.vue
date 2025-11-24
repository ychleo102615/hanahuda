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

  const effectType = card.cardEffectType || 'deal'

  // 設置 transform-origin 為左上角
  el.style.transformOrigin = '0 0'

  // 根據效果類型執行不同動畫
  let motionConfig: Parameters<typeof useMotion>[1]

  if (effectType === 'pulse') {
    // 脈衝效果：原地縮放
    motionConfig = {
      initial: {
        scale: 1,
        opacity: 1,
      },
      enter: {
        scale: [1, 1.15, 1],
        opacity: 1,
        transition: {
          duration: 300,
          ease: 'easeInOut',
        },
      },
    }
  } else if (effectType === 'fadeOut') {
    // 淡出效果
    motionConfig = {
      initial: {
        opacity: 1,
      },
      enter: {
        opacity: 0,
        transition: {
          duration: 250,
          ease: 'easeOut',
        },
      },
    }
  } else if (effectType === 'fadeIn') {
    // 淡入效果
    motionConfig = {
      initial: {
        opacity: 0,
      },
      enter: {
        opacity: 1,
        transition: {
          duration: 250,
          ease: 'easeIn',
        },
      },
    }
  } else {
    // deal 或 move：移動動畫
    const scaleRatio = card.toRect.width / card.fromRect.width
    const deltaX = card.toRect.x - card.fromRect.x
    const deltaY = card.toRect.y - card.fromRect.y
    const initialOpacity = effectType === 'move' ? 1 : 0

    motionConfig = {
      initial: {
        x: 0,
        y: 0,
        scale: 1,
        opacity: initialOpacity,
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
    }
  }

  const { apply } = useMotion(el, motionConfig)

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
          :card-id="card.displayCardId || card.cardId"
          :is-animation-clone="true"
          :is-face-down="card.isFaceDown"
        />
      </div>
    </div>
  </Teleport>
</template>
