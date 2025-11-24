<script setup lang="ts">
/**
 * CardComponent - 單張卡片組件
 *
 * @description
 * 顯示單張花札卡片，支援 hover、選中、高亮等狀態。
 * 使用 SvgIcon 組件顯示卡片圖案。
 * 使用 @vueuse/motion 實現流暢的動畫效果。
 */

import { computed, ref } from 'vue'
import SvgIcon from '@/components/SvgIcon.vue'
import { getCardIconName, CARD_BACK_ICON_NAME } from '@/utils/cardMapping'
import { useMotion } from '@vueuse/motion'
import { useAnimationLayerStore } from '@/user-interface/adapter/stores'

interface Props {
  cardId: string
  isSelectable?: boolean
  isSelected?: boolean
  isHighlighted?: boolean
  isFaceDown?: boolean
  size?: 'sm' | 'md' | 'lg'
  isAnimationClone?: boolean  // 是否為動畫演出用的複製品
}

const props = withDefaults(defineProps<Props>(), {
  isSelectable: false,
  isSelected: false,
  isHighlighted: false,
  isFaceDown: false,
  size: 'md',
  isAnimationClone: false,
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
      // 可選狀態 - 只保留 cursor 和 shadow，scale 由 motion 處理
      'cursor-pointer hover:drop-shadow-lg': props.isSelectable,
      'cursor-default': !props.isSelectable,
      // 選中狀態 - 只保留 ring 效果，scale 由 motion 處理
      'ring-2 ring-yellow-400 ring-offset-2 drop-shadow-lg': props.isSelected,
      // 高亮狀態（可配對）
      'ring-2 ring-green-400 ring-offset-1 drop-shadow-md': props.isHighlighted && !props.isSelected,
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
const cardRef = ref<HTMLElement | null>(null)

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

// 處理滑鼠進入
function handleMouseEnter() {
  if (props.isSelectable && !props.isSelected) {
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
import { watch } from 'vue'
watch(() => props.isSelected, (selected) => {
  if (selected) {
    apply('selected')
  } else {
    apply('rest')
  }
})
</script>

<template>
  <div
    ref="cardRef"
    :class="[containerClasses, { 'invisible': isHidden }]"
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
