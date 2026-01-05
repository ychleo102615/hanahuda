<!--
  PlayerBadge.vue - 玩家身份徽章

  @description
  共用的玩家身份顯示組件，可用於首頁、Lobby、遊戲頁面等。
  橢圓形邊框設計，左側頭像圖標，右側顯示名稱。

  Props:
  - displayName: string - 顯示名稱（必填）
  - isGuest: boolean - 是否為訪客（預設 false）
  - size: 'sm' | 'md' | 'lg' - 尺寸（預設 'md'）
  - showGuestLabel: boolean - 是否顯示 Guest 標籤（預設 true）

  @example
  ```vue
  <PlayerBadge display-name="Guest_A1B2" :is-guest="true" size="md" />
  ```
-->

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  displayName: string
  isGuest?: boolean
  size?: 'sm' | 'md' | 'lg'
  showGuestLabel?: boolean
  /** 是否可點擊（可點擊時會渲染為 button 並支援 hover 效果） */
  clickable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isGuest: false,
  size: 'md',
  showGuestLabel: true,
  clickable: false,
})

const emit = defineEmits<{
  click: []
}>()

const handleClick = () => {
  if (props.clickable) {
    emit('click')
  }
}

const sizeClasses = computed(() => ({
  sm: 'px-2 py-1 text-xs gap-1.5',
  md: 'px-3 py-1.5 text-sm gap-2',
  lg: 'px-4 py-2 text-base gap-2.5',
}[props.size]))

const iconContainerSize = computed(() => ({
  sm: 'w-5 h-5',
  md: 'w-6 h-6',
  lg: 'w-7 h-7',
}[props.size]))

const iconSize = computed(() => ({
  sm: 'w-3 h-3',
  md: 'w-3.5 h-3.5',
  lg: 'w-4 h-4',
}[props.size]))

const maxNameWidth = computed(() => ({
  sm: 'max-w-[80px]',
  md: 'max-w-[120px]',
  lg: 'max-w-[160px]',
}[props.size]))
</script>

<template>
  <component
    :is="clickable ? 'button' : 'div'"
    :class="[
      'inline-flex items-center rounded-full',
      'bg-gray-700/50 border border-gray-600',
      'text-white font-medium',
      sizeClasses,
      clickable && 'hover:bg-gray-600/50 transition-colors cursor-pointer',
    ]"
    :aria-label="`Player: ${displayName}${isGuest ? ' (Guest)' : ''}`"
    :aria-haspopup="clickable ? 'true' : undefined"
    @click="handleClick"
  >
    <!-- 頭像圖標 -->
    <div
      :class="[
        'rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0',
        iconContainerSize,
      ]"
    >
      <svg
        :class="['text-gray-300', iconSize]"
        fill="currentColor"
        viewBox="0 0 20 20"
        aria-hidden="true"
      >
        <path
          fill-rule="evenodd"
          d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
          clip-rule="evenodd"
        />
      </svg>
    </div>

    <!-- 名稱 -->
    <span :class="['truncate', maxNameWidth]">{{ displayName }}</span>

    <!-- Guest 標籤（可選） -->
    <span
      v-if="isGuest && showGuestLabel"
      class="text-xs text-gray-400 bg-gray-600/50 px-1.5 py-0.5 rounded flex-shrink-0"
    >
      Guest
    </span>
  </component>
</template>
