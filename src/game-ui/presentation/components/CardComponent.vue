<template>
  <div
    :class="cardClasses"
    @click="handleClick"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    :data-card-id="card.id"
  >
    <!-- SVG Icon Display - 根據 size 屬性直接設定 SVG 高度 -->
    <SvgIcon :name="getCardSvgName(card)" :class="svgClasses" />

    <!-- Overlay Info (optional, can be toggled) -->
    <div
      v-if="showCardInfo"
      class="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-between p-1 text-white text-center"
    >
      <div class="text-xs font-bold">{{ card.month }}月</div>
      <div class="card__type text-xs font-semibold">{{ getTypeDisplay(card.type) }}</div>
      <div class="text-[7px] leading-tight px-1">{{ t(`cards.names.${card.name}`) }}</div>
      <div class="card__points text-xs font-bold">{{ card.points }}点</div>
    </div>

    <!-- Hover Tooltip -->
    <div
      v-if="enableHoverTooltip && isHovered"
      class="absolute -top-20 left-1/2 transform -translate-x-1/2 z-50 bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg border border-gray-700 text-sm whitespace-nowrap"
    >
      <div class="flex flex-col gap-1">
        <div class="font-bold text-center text-white">
          {{ card.month }}{{ t('game.tooltip.month') }} - {{ getTypeDisplay(card.type) }}
        </div>
        <div class="text-xs text-gray-200 text-center">{{ t(`cards.names.${card.name}`) }}</div>
        <div class="text-xs text-center">
          <span class="card__tooltip-points font-semibold">
            {{ card.points }}{{ t('game.tooltip.points') }}
          </span>
        </div>
      </div>
      <!-- Arrow -->
      <div
        class="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { CardDefinition } from '@/game-ui/domain/models/GameViewModel'
import SvgIcon from '@/game-ui/presentation/components/SvgIcon.vue'
import { getCardSvgName } from '@/game-ui/presentation/utils/cardAssetMapping'
import { useLocale } from '@/ui/composables/useLocale'

// 懸停狀態管理
const isHovered = ref(false)

const { t } = useLocale()

interface Props {
  card: CardDefinition
  selectable?: boolean
  selected?: boolean
  highlighted?: boolean
  selectedHighlight?: boolean
  hoveredHighlight?: boolean
  size?: 'small' | 'medium' | 'large'
  showCardInfo?: boolean
  enableHoverTooltip?: boolean
}

interface Emits {
  (e: 'click', card: CardDefinition): void
  (e: 'mouseenter', card: CardDefinition): void
  (e: 'mouseleave', card: CardDefinition): void
}

const props = withDefaults(defineProps<Props>(), {
  selectable: false,
  selected: false,
  highlighted: false,
  selectedHighlight: false,
  hoveredHighlight: false,
  size: 'medium',
  showCardInfo: false,
  enableHoverTooltip: true,
})

const emit = defineEmits<Emits>()

const cardClasses = computed(() => {
  const baseClasses = [
    // 基礎 Tailwind 樣式
    'relative border-2 bg-white shadow-md transition-all duration-200',
    // 防止 flex 拉伸，讓尺寸由內容決定
    'flex-shrink-0 inline-block',
    // 互動狀態
    props.selectable ? 'cursor-pointer hover:scale-105' : '',
    // 主題修飾類別
    `card--${props.card.type}`,
  ]

  // 特效處理
  if (props.hoveredHighlight) {
    // Hover 高亮: 整張卡片閃爍 + 放大
    baseClasses.push('animate-pulse scale-110')
  }

  // 邊框高亮優先級處理 (加粗 outline)
  if (props.selected) {
    // 選中配對完成：深藍色邊框，不閃爍
    baseClasses.push('outline outline-4 outline-blue-500 outline-offset-2')
  } else if (props.selectedHighlight) {
    // 選中配對未完成：淡藍色邊框 + outline 閃爍
    baseClasses.push('outline outline-4 outline-blue-300 outline-offset-2 shadow-lg animate-pulse-outline')
  } else if (props.highlighted) {
    // 保留原有的通用高亮
    baseClasses.push('outline outline-4 outline-yellow-400 outline-offset-2 shadow-lg')
  }

  return baseClasses.filter(Boolean).join(' ')
})

const svgClasses = computed(() => {
  // 直接在 SVG 上設定高度，讓 SVG 的寬度自然適應
  const height = props.size === 'small' ? 'h-16' : props.size === 'large' ? 'h-32' : 'h-24'
  return `${height} w-auto block`
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
</script>

<style scoped>
/* CSS Variables for card themes */
.card--bright {
  --card-bg: #fef3c7; /* bg-amber-100 */
  --card-border: #f59e0b; /* border-amber-500 */
  --card-text: #92400e; /* text-amber-700 */
  --card-text-dark: #78350f; /* text-amber-800 */
  --card-tooltip: #fcd34d; /* text-amber-300 */
}

.card--animal {
  --card-bg: #dcfce7; /* bg-green-100 */
  --card-border: #22c55e; /* border-green-500 */
  --card-text: #15803d; /* text-green-700 */
  --card-text-dark: #166534; /* text-green-800 */
  --card-tooltip: #86efac; /* text-green-300 */
}

.card--ribbon {
  --card-bg: #fecaca; /* bg-red-100 */
  --card-border: #ef4444; /* border-red-500 */
  --card-text: #dc2626; /* text-red-600 */
  --card-text-dark: #b91c1c; /* text-red-700 */
  --card-tooltip: #fca5a5; /* text-red-300 */
}

.card--plain {
  --card-bg: #f3f4f6; /* bg-gray-100 */
  --card-border: #9ca3af; /* border-gray-400 */
  --card-text: #4b5563; /* text-gray-600 */
  --card-text-dark: #1f2937; /* text-gray-800 */
  --card-tooltip: #d1d5db; /* text-gray-300 */
}

/* Card type themes - 使用統一的變數名稱 */
.card--bright,
.card--animal,
.card--ribbon,
.card--plain {
  background-color: var(--card-bg);
  border-color: var(--card-border);
}

/* Info overlay theme colors */
.card__type {
  color: var(--card-text);
}

.card__points {
  color: var(--card-text-dark);
}

/* Tooltip theme colors */
.card__tooltip-points {
  color: var(--card-tooltip);
}

/* Custom outline pulse animation - matching Tailwind's animate-pulse timing */
@keyframes pulse-outline-blue {
  0%, 100% {
    outline-color: rgb(147 197 253); /* blue-300 - same as Tailwind */
  }
  50% {
    outline-color: rgba(147, 197, 253, 0.4); /* blue-300 with reduced opacity */
  }
}

.animate-pulse-outline {
  animation: pulse-outline-blue 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  /* Ensure animation takes priority over Tailwind color */
  animation-fill-mode: both;
}
</style>
