<template>
  <div
    :class="cardClasses"
    @click="handleClick"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    :data-card-id="card.id"
  >
    <div class="w-full h-full relative">
      <!-- SVG Icon Display -->
      <div class="absolute inset-0 flex items-center justify-center">
        <SvgIcon
          :name="getCardSvgName(card)"
          :className="getSvgIconClasses()"
        />
      </div>

      <!-- Overlay Info (optional, can be toggled) -->
      <div
        v-if="showCardInfo"
        class="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-between p-1 text-white text-center"
      >
        <div class="text-xs font-bold">{{ card.month }}月</div>
        <div :class="getTypeClasses(card.type)">{{ getTypeDisplay(card.type) }}</div>
        <div class="text-[7px] leading-tight px-1">{{ card.name }}</div>
        <div :class="getPointsClasses(card.type)">{{ card.points }}点</div>
      </div>

      <!-- Hover Tooltip -->
      <div
        v-if="enableHoverTooltip && isHovered"
        class="absolute -top-20 left-1/2 transform -translate-x-1/2 z-50 bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg border border-gray-700 text-sm whitespace-nowrap"
      >
        <div class="flex flex-col gap-1">
          <div class="font-bold text-center text-white">{{ card.month }}月 - {{ getTypeDisplay(card.type) }}</div>
          <div class="text-xs text-gray-200 text-center">{{ card.name }}</div>
          <div class="text-xs text-center">
            <span :class="getTooltipPointsClasses(card.type)">
              {{ card.points }}點
            </span>
          </div>
        </div>
        <!-- Arrow -->
        <div class="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Card } from '@/domain/entities/Card'
import SvgIcon from './SvgIcon.vue'
import { getCardSvgName } from '@/shared/utils/cardAssetMapping'

// 懸停狀態管理
const isHovered = ref(false)

interface Props {
  card: Card
  selectable?: boolean
  selected?: boolean
  highlighted?: boolean
  size?: 'small' | 'medium' | 'large'
  showCardInfo?: boolean
  enableHoverTooltip?: boolean
}

interface Emits {
  (e: 'click', card: Card): void
  (e: 'mouseenter', card: Card): void
  (e: 'mouseleave', card: Card): void
}

const props = withDefaults(defineProps<Props>(), {
  selectable: false,
  selected: false,
  highlighted: false,
  size: 'medium',
  showCardInfo: false,
  enableHoverTooltip: true,
})

const emit = defineEmits<Emits>()

const cardClasses = computed(() => {
  const baseClasses = [
    'relative border-2 bg-white shadow-md transition-all duration-200',
    props.size === 'small' ? 'w-12 h-16' : props.size === 'large' ? 'w-20 h-32' : 'w-16 h-24',
    props.selectable ? 'cursor-pointer hover:scale-105' : '',
    props.selected ? 'outline outline-2 outline-blue-500 outline-offset-2' : '',
    props.highlighted ? 'outline outline-2 outline-yellow-400 outline-offset-2 shadow-lg' : '',
  ]

  // Card type specific styling
  if (props.card.type === 'bright') {
    baseClasses.push('bg-amber-100 border-amber-500')
  } else if (props.card.type === 'animal') {
    baseClasses.push('bg-green-100 border-green-500')
  } else if (props.card.type === 'ribbon') {
    baseClasses.push('bg-red-100 border-red-500')
  } else if (props.card.type === 'plain') {
    baseClasses.push('bg-gray-100 border-gray-400')
  } else {
    baseClasses.push('border-gray-300')
  }

  return baseClasses.filter(Boolean).join(' ')
})

const handleClick = () => {
  if (props.selectable) {
    emit('click', props.card)
  }
}

const handleMouseEnter = () => {
  if (props.enableHoverTooltip) {
    isHovered.value = true
  }
  emit('mouseenter', props.card)
}

const handleMouseLeave = () => {
  if (props.enableHoverTooltip) {
    isHovered.value = false
  }
  emit('mouseleave', props.card)
}

const getTypeDisplay = (type: string): string => {
  const typeMap: Record<string, string> = {
    bright: '光',
    animal: '種',
    ribbon: '短',
    plain: 'カス',
  }
  return typeMap[type] || type
}

const getTypeClasses = (type: string): string => {
  const baseClasses = 'text-xs font-semibold'
  if (type === 'bright') return `${baseClasses} text-amber-700`
  if (type === 'animal') return `${baseClasses} text-green-700`
  if (type === 'ribbon') return `${baseClasses} text-red-600`
  if (type === 'plain') return `${baseClasses} text-gray-600`
  return baseClasses
}

const getPointsClasses = (type: string): string => {
  const baseClasses = 'text-xs font-bold'
  if (type === 'bright') return `${baseClasses} text-amber-800`
  if (type === 'animal') return `${baseClasses} text-green-800`
  if (type === 'ribbon') return `${baseClasses} text-red-700`
  if (type === 'plain') return `${baseClasses} text-gray-800`
  return baseClasses
}

const getSvgIconClasses = (): string => {
  // SVG 應該填滿整個卡片容器
  return 'w-full h-full object-cover'
}

const getTooltipPointsClasses = (type: string): string => {
  const baseClasses = 'font-semibold'
  // 提示框專用，使用較淺的顏色以便在深色背景上閱讀
  if (type === 'bright') return `${baseClasses} text-amber-300`
  if (type === 'animal') return `${baseClasses} text-green-300`
  if (type === 'ribbon') return `${baseClasses} text-red-300`
  if (type === 'plain') return `${baseClasses} text-gray-300`
  return `${baseClasses} text-white`
}
</script>

<style scoped>
/* All styling is now handled by Tailwind classes in the template */
</style>
