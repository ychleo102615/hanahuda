<script setup lang="ts">
/**
 * CardComponent - 單張卡片組件
 *
 * @description
 * 顯示單張花札卡片，支援 hover、選中、高亮等狀態。
 * 使用 SvgIcon 組件顯示卡片圖案。
 */

import { computed } from 'vue'
import SvgIcon from '@/components/SvgIcon.vue'
import { getCardIconName } from '@/utils/cardMapping'

interface Props {
  cardId: string
  isSelectable?: boolean
  isSelected?: boolean
  isHighlighted?: boolean
  isFaceDown?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  isSelectable: false,
  isSelected: false,
  isHighlighted: false,
  isFaceDown: false,
  size: 'md',
})

const emit = defineEmits<{
  click: [cardId: string]
}>()

// 卡片尺寸樣式
const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'h-18 w-auto'
    case 'lg':
      return 'h-32 w-auto'
    default:
      return 'h-24 w-auto'
  }
})

// 容器樣式
const containerClasses = computed(() => {
  return [
    'inline-flex items-center justify-center p-1 rounded-md transition-all duration-200',
    {
      // 可選狀態
      'cursor-pointer hover:scale-105 hover:drop-shadow-lg': props.isSelectable,
      'cursor-default': !props.isSelectable,
      // 選中狀態
      'ring-2 ring-yellow-400 ring-offset-2 scale-105 drop-shadow-lg': props.isSelected,
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
    return 'card-back'
  }
  return getCardIconName(props.cardId)
})
</script>

<template>
  <div :class="containerClasses" @click="handleClick" :data-card-id="cardId">
    <SvgIcon
      :name="cardIconName"
      :class-name="sizeClasses"
      :aria-label="`Card ${cardId}`"
    />
  </div>
</template>
