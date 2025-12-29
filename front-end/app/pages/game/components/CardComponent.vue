<script setup lang="ts">
/**
 * CardComponent - 單張卡片組件
 *
 * @description
 * 顯示單張花札卡片，支援 hover、選中、高亮等狀態。
 * 使用 SvgIcon 組件顯示卡片圖案。
 * 使用 @vueuse/motion 實現流暢的動畫效果。
 */

import { computed, shallowRef, watch } from 'vue'
import SvgIcon from '~/components/SvgIcon.vue'
import { getCardIconName, CARD_BACK_ICON_NAME } from '~/utils/cardMapping'
import { useMotion } from '@vueuse/motion'
import { useAnimationLayerStore } from '~/user-interface/adapter/stores'

interface Props {
  cardId: string
  isSelectable?: boolean
  isSelected?: boolean
  isHighlighted?: boolean
  isFaceDown?: boolean
  size?: 'sm' | 'md' | 'lg' | 'auto'
  isAnimationClone?: boolean  // 是否為動畫演出用的複製品
  isPreviewHighlighted?: boolean  // 懸浮預覽高亮（紫色框，不閃爍）
  isSingleMatchHighlight?: boolean  // 單一配對高亮（綠色框 + 輕微閃爍）
  isMultipleMatchHighlight?: boolean  // 多重配對高亮（橙色框 + 明顯閃爍）
  enableShake?: boolean  // 啟用震動動畫
}

const props = withDefaults(defineProps<Props>(), {
  isSelectable: false,
  isSelected: false,
  isHighlighted: false,
  isFaceDown: false,
  size: 'md',
  isAnimationClone: false,
  isPreviewHighlighted: false,
  isSingleMatchHighlight: false,
  isMultipleMatchHighlight: false,
  enableShake: false,
})

const emit = defineEmits<{
  click: [cardId: string]
}>()

// 動畫層 store - 用於檢查卡片是否應該隱藏
const animationStore = useAnimationLayerStore()

// 檢查卡片是否應該隱藏（動畫期間）
// 動畫複製品不檢查隱藏狀態
const isHidden = computed(() =>
  !props.isAnimationClone && animationStore.isCardHidden(props.cardId)
)

// 卡片尺寸樣式
const sizeClasses = computed(() => {
  // 動畫複製品自動填滿容器
  if (props.isAnimationClone) {
    return 'h-full w-full'
  }

  // RWD 動態尺寸：讀取容器提供的 CSS 變數
  if (props.size === 'auto') {
    return 'h-[var(--card-height,6rem)] w-auto'
  }

  switch (props.size) {
    case 'sm':
      return 'h-18 w-auto'
    case 'lg':
      return 'h-32 w-auto'
    default:
      return 'h-24 w-auto'
  }
})

// 容器樣式 - 移除 hover:scale 因為改用 @vueuse/motion
const containerClasses = computed(() => {
  return [
    'inline-flex items-center justify-center rounded-md transition-shadow duration-200',
    {
      // 可選狀態 - 只保留 cursor（hover shadow 移至 CSS @media 處理）
      'cursor-pointer': props.isSelectable,
      'cursor-default': !props.isSelectable,

      // 選中狀態（優先級最高）- 金色框
      'ring-2 ring-yellow-400 ring-offset-2 drop-shadow-lg': props.isSelected,

      // 多重配對高亮（優先級次高）- 橙色框 + 閃爍
      'ring-2 ring-orange-400 ring-offset-1 drop-shadow-md animate-pulse-strong':
        props.isMultipleMatchHighlight && !props.isSelected,

      // 單一配對高亮（優先級中）- 綠色框 + 輕微閃爍
      'ring-2 ring-green-400 ring-offset-1 drop-shadow-md animate-pulse-soft':
        props.isSingleMatchHighlight && !props.isMultipleMatchHighlight && !props.isSelected,

      // 原配對高亮狀態（保留，用於其他情境）- 綠色框，不閃爍
      'ring-2 ring-green-400 ring-offset-1 drop-shadow-md':
        props.isHighlighted && !props.isSingleMatchHighlight && !props.isMultipleMatchHighlight && !props.isSelected,

      // 預覽高亮狀態（最低優先）- 紫色框
      'ring-2 ring-purple-400 ring-offset-1 drop-shadow-sm':
        props.isPreviewHighlighted && !props.isHighlighted && !props.isSingleMatchHighlight && !props.isMultipleMatchHighlight && !props.isSelected,
    },
  ]
})

// 處理點擊
function handleClick() {
  if (props.isSelectable) {
    emit('click', props.cardId)
  }
}

// 取得卡片圖標名稱
const cardIconName = computed(() => {
  if (props.isFaceDown) {
    return CARD_BACK_ICON_NAME
  }
  return getCardIconName(props.cardId)
})

// 卡片容器 ref 用於 motion
const cardRef = shallowRef<HTMLElement | null>(null)

// 檢測是否支援真正的 hover（非觸控設備）
// 觸控設備沒有 hover 概念，禁用 hover 動畫避免「黏住」問題
const supportsHover = typeof window !== 'undefined'
  ? window.matchMedia('(hover: hover)').matches
  : true

// 使用 @vueuse/motion 設定動畫
const { apply } = useMotion(cardRef, {
  initial: {
    scale: 1,
    y: 0,
  },
  hovered: {
    scale: 1.05,
    y: -4,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 25,
    },
  },
  selected: {
    scale: 1.08,
    y: -6,
    transition: {
      type: 'spring',
      stiffness: 500,
      damping: 20,
    },
  },
  rest: {
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
    },
  },
})

// 處理滑鼠進入（只在支援 hover 的設備上觸發）
function handleMouseEnter() {
  if (supportsHover && props.isSelectable && !props.isSelected) {
    apply('hovered')
  }
}

// 處理滑鼠離開
function handleMouseLeave() {
  if (!props.isSelected) {
    apply('rest')
  }
}

// 監聽選中狀態變化
watch(() => props.isSelected, (selected) => {
  if (selected) {
    apply('selected')
  } else {
    apply('rest')
  }
})

// 監聽震動動畫
watch(() => props.enableShake, (shouldShake) => {
  if (shouldShake && cardRef.value) {
    cardRef.value.classList.add('shake')
    setTimeout(() => {
      cardRef.value?.classList.remove('shake')
    }, 500)
  }
})
</script>

<template>
  <div
    ref="cardRef"
    :class="[containerClasses, { 'opacity-0': isHidden }]"
    :data-card-id="isAnimationClone ? undefined : cardId"
    @click="handleClick"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <SvgIcon
      :name="cardIconName"
      :class-name="sizeClasses"
      :aria-label="`Card ${cardId}`"
    />
  </div>
</template>

<style scoped>
/* 輕微閃爍 - 單一配對 */
@keyframes pulse-soft {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.animate-pulse-soft {
  animation: pulse-soft 2s ease-in-out infinite;
}

/* 明顯閃爍 - 多重配對 */
@keyframes pulse-strong {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(1.02); }
}

.animate-pulse-strong {
  animation: pulse-strong 1s ease-in-out infinite;
}

/* 震動動畫 */
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
  20%, 40%, 60%, 80% { transform: translateX(4px); }
}

.shake {
  animation: shake 0.5s ease-in-out;
}

/* 只在支援 hover 的設備上（非觸控）顯示 hover 陰影效果 */
@media (hover: hover) {
  .cursor-pointer:hover {
    filter: drop-shadow(0 10px 8px rgb(0 0 0 / 0.04)) drop-shadow(0 4px 3px rgb(0 0 0 / 0.1));
  }
}
</style>
