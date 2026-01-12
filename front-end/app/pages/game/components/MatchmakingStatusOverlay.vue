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
import { ref, computed, watch, onUnmounted } from 'vue'
import { useMatchmakingStateStore } from '~/game-client/adapter/stores/matchmakingState'

const matchmakingStore = useMatchmakingStateStore()

// 本地計時器
const localElapsedSeconds = ref(0)
let timerInterval: ReturnType<typeof setInterval> | null = null

// 是否顯示覆蓋層（searching, low_availability, matched 狀態時顯示）
const isVisible = computed(() => {
  const status = matchmakingStore.status
  return status === 'searching' || status === 'low_availability' || status === 'matched'
})

// 是否配對成功
const isMatched = computed(() => matchmakingStore.status === 'matched')

// 監聽可見狀態，啟動/停止計時器
watch(isVisible, (visible) => {
  if (visible && !isMatched.value) {
    startTimer()
  } else {
    stopTimer()
  }
}, { immediate: true })

// 配對成功時停止計時器
watch(isMatched, (matched) => {
  if (matched) {
    stopTimer()
  }
})

function startTimer() {
  if (timerInterval) return
  // 從 store 同步初始值（可能是從 SSE 事件取得的）
  localElapsedSeconds.value = matchmakingStore.elapsedSeconds
  timerInterval = setInterval(() => {
    localElapsedSeconds.value++
  }, 1000)
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
}

onUnmounted(() => {
  stopTimer()
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

// 經過時間顯示（單純秒數）
const elapsedDisplay = computed(() => `${localElapsedSeconds.value}s`)

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
  <Transition name="overlay-leave-only">
    <div
      v-if="isVisible"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
    >
      <!-- 固定尺寸容器，避免抖動 -->
      <div class="text-center p-8 w-80">
        <!-- 旋轉圓環動畫 -->
        <div class="flex justify-center mb-8">
          <div class="relative w-32 h-32">
            <!-- 外圈（配對成功時改為綠色且停止旋轉） -->
            <div
              class="absolute inset-0 rounded-full border-4"
              :class="isMatched ? 'border-green-500/30' : 'border-amber-500/30'"
            />
            <div
              class="absolute inset-0 rounded-full border-4 border-transparent"
              :class="[
                isMatched ? 'border-t-green-400' : 'border-t-amber-400',
                isMatched ? 'invisible' : 'animate-spin-slow'
              ]"
            />
            <!-- 內圈圖標 -->
            <div class="absolute inset-4 rounded-full bg-gray-800/80 flex items-center justify-center">
              <svg
                class="w-12 h-12"
                :class="isMatched ? 'text-green-400' : 'text-amber-400'"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
              </svg>
            </div>
          </div>
        </div>

        <!-- 主標題（固定高度） -->
        <h2
          class="text-3xl font-bold tracking-wide h-10"
          :class="isMatched ? 'text-green-400' : 'text-amber-400'"
        >
          {{ titleText }}
        </h2>

        <!-- 副標題（固定高度） -->
        <p class="text-sm font-medium tracking-widest text-gray-300 uppercase mt-4 h-5">
          {{ subtitleText }}
        </p>

        <!-- 經過時間（固定高度，使用 opacity 隱藏保留空間） -->
        <div class="pt-4 pb-6 h-20">
          <p
            class="text-xs text-gray-500 tracking-wider mb-1 transition-opacity"
            :class="isMatched ? 'opacity-0' : 'opacity-100'"
          >
            ELAPSED TIME
          </p>
          <p
            class="text-2xl font-mono text-white transition-opacity"
            :class="isMatched ? 'opacity-0' : 'opacity-100'"
          >
            {{ elapsedDisplay }}
          </p>
        </div>

        <!-- 取消按鈕（固定高度，使用 opacity + pointer-events 隱藏） -->
        <div class="h-14 flex items-center justify-center">
          <button
            class="px-8 py-3 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg"
            :class="showCancelButton ? 'opacity-100' : 'opacity-0 pointer-events-none'"
            @click="handleCancel"
          >
            Cancel Matchmaking
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* 只有 leave 動畫，無 enter 動畫 */
.overlay-leave-only-leave-active {
  transition: opacity 0.3s ease;
}

.overlay-leave-only-leave-to {
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
