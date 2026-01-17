<!--
  MatchmakingStatusOverlay.vue - 配對狀態覆蓋層

  @description
  顯示線上配對狀態的全螢幕覆蓋層。
  在 game page 偵測到配對模式時顯示，配對成功後自動消失。

  狀態顯示：
  - searching: 正在尋找對手... (0-10秒)
  - low_availability: 對手較少，繼續等待... (10-15秒)
  - matched: 配對成功！準備開始遊戲...
  - starting: 遊戲開始中...（等待發牌）

  @module app/pages/game/components/MatchmakingStatusOverlay
-->

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { useMatchmakingStateStore } from '~/game-client/adapter/stores/matchmakingState'

const matchmakingStore = useMatchmakingStateStore()

// 本地計時器（非響應式，避免不必要的追蹤）
let localElapsedSeconds = 0
let timerInterval: ReturnType<typeof setInterval> | null = null
const displayedSeconds = ref(0)

// UI 階段：單一狀態來源，減少多個 computed 的重複計算
type UIPhase = 'hidden' | 'searching' | 'matched'
const uiPhase = computed<UIPhase>(() => {
  const status = matchmakingStore.status
  if (status === 'matched' || status === 'starting') {
    return 'matched'
  }
  if (status === 'searching' || status === 'low_availability') {
    return 'searching'
  }
  return 'hidden'
})

// 衍生狀態（從 uiPhase 計算，不再直接依賴 store.status）
const isVisible = computed(() => uiPhase.value !== 'hidden')
const isMatched = computed(() => uiPhase.value === 'matched')

// 對手資訊快照（只在 matched 時讀取一次，避免後續響應式追蹤）
const opponentSnapshot = ref<{ name: string; isBot: boolean } | null>(null)

// 單一 watch 控制計時器和對手資訊快照
watch(uiPhase, (phase, oldPhase) => {
  if (phase === 'searching') {
    startTimer()
  } else if (oldPhase === 'searching') {
    // 從 searching 離開時停止計時器
    stopTimer()
  }

  // 進入 matched 狀態時快照對手資訊
  if (phase === 'matched') {
    opponentSnapshot.value = {
      name: matchmakingStore.opponentName || 'Opponent',
      isBot: matchmakingStore.isBot,
    }
  } else if (phase === 'hidden') {
    opponentSnapshot.value = null
  }
}, { immediate: true })

function startTimer() {
  if (timerInterval) return
  // 從 store 同步初始值
  localElapsedSeconds = matchmakingStore.elapsedSeconds
  displayedSeconds.value = localElapsedSeconds
  timerInterval = setInterval(() => {
    localElapsedSeconds++
    displayedSeconds.value = localElapsedSeconds
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

// 主標題（從 uiPhase 衍生，減少響應式追蹤）
const titleText = computed(() => {
  // matched 和 starting 都屬於 uiPhase === 'matched'
  // 需要區分顯示文字時，才訪問 store.status
  if (uiPhase.value === 'matched') {
    return matchmakingStore.status === 'starting' ? 'Starting Game' : 'Match Found!'
  }
  return 'Searching'
})

// 副標題（從 uiPhase 和 opponentSnapshot 衍生）
const subtitleText = computed(() => {
  if (uiPhase.value === 'matched') {
    // 使用快照，避免額外響應式追蹤
    if (opponentSnapshot.value) {
      const { name, isBot } = opponentSnapshot.value
      return matchmakingStore.status === 'starting'
        ? 'PREPARING GAME...'
        : `vs. ${name}${isBot ? ' (Bot)' : ''}`
    }
    return 'PREPARING GAME...'
  }
  // searching 狀態：需要區分 low_availability
  const status = matchmakingStore.status
  if (status === 'low_availability') return 'FEW PLAYERS ONLINE...'
  return 'FINDING AN OPPONENT...'
})

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
              class="absolute inset-0 rounded-full border-4 ring-base"
              :class="{ 'is-matched': isMatched }"
            />
            <div
              class="absolute inset-0 rounded-full border-4 border-transparent ring-spinner"
              :class="{ 'is-matched': isMatched }"
            />
            <!-- 內圈圖標 -->
            <div class="absolute inset-4 rounded-full bg-gray-800/80 flex items-center justify-center">
              <svg
                class="w-12 h-12 icon-color"
                :class="{ 'is-matched': isMatched }"
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
          class="text-3xl font-bold tracking-wide h-10 title-color"
          :class="{ 'is-matched': isMatched }"
        >
          {{ titleText }}
        </h2>

        <!-- 副標題（固定高度） -->
        <p class="text-sm font-medium tracking-widest text-gray-300 uppercase mt-4 h-5">
          {{ subtitleText }}
        </p>

        <!-- 經過時間（固定高度，配對成功時直接隱藏） -->
        <div v-if="!isMatched" class="pt-4 pb-6 h-20">
          <p class="text-xs text-gray-500 tracking-wider mb-1">
            ELAPSED TIME
          </p>
          <p class="text-2xl font-mono text-white">
            {{ displayedSeconds }}s
          </p>
        </div>
        <div v-else class="pt-4 pb-6 h-20" />

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
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* === 基於 class 的狀態樣式（直接綁定，避免屬性選擇器的 iOS Safari 問題） === */

/* 預設狀態（searching） */
.ring-base {
  border-color: rgb(245 158 11 / 0.3); /* amber-500/30 */
  transition: border-color 0.3s ease;
}

.ring-spinner {
  border-top-color: rgb(251 191 36); /* amber-400 */
  animation: spin 2s linear infinite;
  transition: border-top-color 0.3s ease, visibility 0s linear 0.3s;
}

.icon-color {
  color: rgb(251 191 36); /* amber-400 */
  transition: color 0.3s ease;
}

.title-color {
  color: rgb(251 191 36); /* amber-400 */
  transition: color 0.3s ease;
}

/* matched 狀態 - 使用 .is-matched class */
.ring-base.is-matched {
  border-color: rgb(34 197 94 / 0.3); /* green-500/30 */
}

.ring-spinner.is-matched {
  border-top-color: rgb(74 222 128); /* green-400 */
  animation: none;
  visibility: hidden;
}

.icon-color.is-matched {
  color: rgb(74 222 128); /* green-400 */
}

.title-color.is-matched {
  color: rgb(74 222 128); /* green-400 */
}
</style>
