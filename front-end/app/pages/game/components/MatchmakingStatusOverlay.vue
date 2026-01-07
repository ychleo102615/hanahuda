<!--
  MatchmakingStatusOverlay.vue - 配對狀態覆蓋層

  @description
  顯示線上配對狀態的全螢幕覆蓋層。
  在 game page 偵測到配對模式時顯示，配對成功後自動消失。

  狀態顯示：
  - searching: 正在尋找對手... (0-10秒)
  - low_availability: 對手較少，繼續等待... (10-15秒)
  - matched: 配對成功！準備開始遊戲...

  @module app/pages/game/components/MatchmakingStatusOverlay
-->

<script setup lang="ts">
import { computed } from 'vue'
import { useMatchmakingStateStore } from '~/user-interface/adapter/stores/matchmakingState'

const matchmakingStore = useMatchmakingStateStore()

// 是否顯示覆蓋層（searching, low_availability, matched 狀態時顯示）
const isVisible = computed(() => {
  const status = matchmakingStore.status
  return status === 'searching' || status === 'low_availability' || status === 'matched'
})

// 狀態文字
const statusText = computed(() => {
  switch (matchmakingStore.status) {
    case 'searching':
      return 'Searching for opponent...'
    case 'low_availability':
      return 'Few players online, still searching...'
    case 'matched':
      return 'Match found!'
    default:
      return ''
  }
})

// 狀態副文字
const statusSubtext = computed(() => {
  if (matchmakingStore.status === 'matched') {
    const opponentName = matchmakingStore.opponentName || 'Opponent'
    const botIndicator = matchmakingStore.isBot ? ' (Bot)' : ''
    return `vs. ${opponentName}${botIndicator}`
  }
  if (matchmakingStore.statusMessage) {
    return matchmakingStore.statusMessage
  }
  return null
})

// 經過時間顯示
const elapsedDisplay = computed(() => {
  const seconds = matchmakingStore.elapsedSeconds
  if (seconds < 60) {
    return `${seconds}s`
  }
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}m ${remainingSeconds}s`
})

// 狀態指示器顏色
const indicatorClass = computed(() => {
  switch (matchmakingStore.status) {
    case 'matched':
      return 'bg-green-500'
    case 'low_availability':
      return 'bg-yellow-500'
    default:
      return 'bg-blue-500'
  }
})

// 是否顯示取消按鈕
const showCancelButton = computed(() => {
  return matchmakingStore.status === 'searching' || matchmakingStore.status === 'low_availability'
})

// 取消事件
const emit = defineEmits<{
  cancel: []
}>()

const handleCancel = () => {
  emit('cancel')
}
</script>

<template>
  <Transition name="fade">
    <div
      v-if="isVisible"
      class="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/90 backdrop-blur-sm"
    >
      <div class="text-center space-y-6 p-8">
        <!-- 狀態指示器 -->
        <div class="flex justify-center">
          <div
            :class="[
              'w-4 h-4 rounded-full animate-pulse',
              indicatorClass
            ]"
          />
        </div>

        <!-- 狀態文字 -->
        <div class="space-y-2">
          <h2 class="text-2xl font-bold text-white">
            {{ statusText }}
          </h2>
          <p
            v-if="statusSubtext"
            class="text-lg text-gray-300"
          >
            {{ statusSubtext }}
          </p>
        </div>

        <!-- 經過時間 -->
        <div
          v-if="matchmakingStore.status !== 'matched'"
          class="text-sm text-gray-400"
        >
          Elapsed: {{ elapsedDisplay }}
        </div>

        <!-- 載入動畫 -->
        <div
          v-if="matchmakingStore.status !== 'matched'"
          class="flex justify-center space-x-2"
        >
          <div class="w-2 h-2 bg-white rounded-full animate-bounce" style="animation-delay: 0ms" />
          <div class="w-2 h-2 bg-white rounded-full animate-bounce" style="animation-delay: 150ms" />
          <div class="w-2 h-2 bg-white rounded-full animate-bounce" style="animation-delay: 300ms" />
        </div>

        <!-- 取消按鈕 -->
        <button
          v-if="showCancelButton"
          class="mt-4 px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors duration-200"
          @click="handleCancel"
        >
          Cancel
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
