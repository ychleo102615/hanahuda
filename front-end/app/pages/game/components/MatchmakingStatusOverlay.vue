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

// 主標題
const titleText = computed(() => {
  switch (matchmakingStore.status) {
    case 'matched':
      return 'Match Found!'
    default:
      return 'Searching'
  }
})

// 副標題
const subtitleText = computed(() => {
  if (matchmakingStore.status === 'matched') {
    const opponentName = matchmakingStore.opponentName || 'Opponent'
    const botIndicator = matchmakingStore.isBot ? ' (Bot)' : ''
    return `vs. ${opponentName}${botIndicator}`
  }
  if (matchmakingStore.status === 'low_availability') {
    return 'FEW PLAYERS ONLINE...'
  }
  return 'FINDING AN OPPONENT...'
})

// 經過時間顯示（格式：MM:SS）
const elapsedDisplay = computed(() => {
  const totalSeconds = matchmakingStore.elapsedSeconds
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
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
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
    >
      <div class="text-center space-y-6 p-8">
        <!-- 旋轉圓環動畫 -->
        <div class="flex justify-center mb-8">
          <div class="relative w-32 h-32">
            <!-- 外圈旋轉 -->
            <div class="absolute inset-0 rounded-full border-4 border-amber-500/30" />
            <div class="absolute inset-0 rounded-full border-4 border-transparent border-t-amber-400 animate-spin-slow" />
            <!-- 內圈圖標 -->
            <div class="absolute inset-4 rounded-full bg-gray-800/80 flex items-center justify-center">
              <svg
                class="w-12 h-12 text-amber-400"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
              </svg>
            </div>
          </div>
        </div>

        <!-- 主標題 -->
        <h2
          class="text-3xl font-bold tracking-wide"
          :class="matchmakingStore.status === 'matched' ? 'text-green-400' : 'text-amber-400'"
        >
          {{ titleText }}
        </h2>

        <!-- 副標題 -->
        <p class="text-sm font-medium tracking-widest text-gray-300 uppercase">
          {{ subtitleText }}
        </p>

        <!-- 經過時間 -->
        <div
          v-if="matchmakingStore.status !== 'matched'"
          class="pt-4"
        >
          <p class="text-xs text-gray-500 tracking-wider mb-1">ELAPSED TIME</p>
          <p class="text-2xl font-mono text-white">{{ elapsedDisplay }}</p>
        </div>

        <!-- 取消按鈕 -->
        <button
          v-if="showCancelButton"
          class="mt-6 px-8 py-3 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg transition-colors duration-200 shadow-lg"
          @click="handleCancel"
        >
          Cancel Matchmaking
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

/* 自定義慢速旋轉動畫 */
.animate-spin-slow {
  animation: spin 2s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
