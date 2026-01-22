<!--
  MatchmakingStatusOverlay.vue - 配對狀態覆蓋層

  @description
  顯示線上配對狀態的全螢幕覆蓋層。
  在 game page 偵測到配對模式時顯示，配對成功後自動消失。

  狀態顯示：
  - connecting: 正在連線到伺服器...
  - searching: 正在尋找對手... (0-10秒)
  - low_availability: 對手較少，繼續等待... (10-15秒)
  - matched: 配對成功！準備開始遊戲...
  - starting: 遊戲開始中...（等待發牌）
  - error: 連線錯誤（顯示重整按鈕）

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
type UIPhase = 'hidden' | 'connecting' | 'searching' | 'matched' | 'error'
const uiPhase = computed<UIPhase>(() => {
  const status = matchmakingStore.status
  if (status === 'error') {
    return 'error'
  }
  if (status === 'matched' || status === 'starting') {
    return 'matched'
  }
  if (status === 'connecting') {
    return 'connecting'
  }
  if (status === 'searching' || status === 'low_availability') {
    return 'searching'
  }
  return 'hidden'
})

// 衍生狀態（從 uiPhase 計算，不再直接依賴 store.status）
const isVisible = computed(() => uiPhase.value !== 'hidden')
const isMatched = computed(() => uiPhase.value === 'matched')
const isConnecting = computed(() => uiPhase.value === 'connecting')
const isError = computed(() => uiPhase.value === 'error')

// 對手資訊快照（只在 matched 時讀取一次，避免後續響應式追蹤）
const opponentSnapshot = ref<{ name: string; isBot: boolean } | null>(null)

// 單一 watch 控制計時器和對手資訊快照
watch(uiPhase, (phase, oldPhase) => {
  // connecting 狀態不啟動計時器
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
  } else if (phase === 'hidden' || phase === 'error') {
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
  const phase = uiPhase.value
  if (phase === 'error') {
    return 'Connection Error'
  }
  // matched 和 starting 都屬於 uiPhase === 'matched'
  // 需要區分顯示文字時，才訪問 store.status
  if (phase === 'matched') {
    return matchmakingStore.status === 'starting' ? 'Starting Game' : 'Match Found!'
  }
  if (phase === 'connecting') {
    return 'Connecting'
  }
  return 'Searching'
})

// 副標題（從 uiPhase 和 opponentSnapshot 衍生）
const subtitleText = computed(() => {
  const phase = uiPhase.value
  if (phase === 'error') {
    // 錯誤狀態使用簡短訊息，詳細訊息顯示在按鈕區域
    return 'CONNECTION FAILED'
  }
  if (phase === 'matched') {
    // 使用快照，避免額外響應式追蹤
    if (opponentSnapshot.value) {
      const { name, isBot } = opponentSnapshot.value
      return matchmakingStore.status === 'starting'
        ? 'PREPARING GAME...'
        : `vs. ${name}${isBot ? ' (Bot)' : ''}`
    }
    return 'PREPARING GAME...'
  }
  if (phase === 'connecting') {
    return 'CONNECTING TO SERVER...'
  }
  // searching 狀態：需要區分 low_availability
  const status = matchmakingStore.status
  if (status === 'low_availability') return 'FEW PLAYERS ONLINE...'
  return 'FINDING AN OPPONENT...'
})

// 重整頁面
function handleRefresh() {
  window.location.reload()
}

</script>

<template>
  <Transition name="overlay-leave-only">
    <div
      v-if="isVisible"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
    >
      <!--
        固定尺寸容器：所有狀態的總高度必須一致
        這樣 flex items-center 計算的置中點才不會改變
      -->
      <div class="text-center p-8 w-80">
        <!-- 旋轉圓環動畫：h-32 (128px) + mb-8 (32px) = 160px -->
        <div class="flex justify-center mb-8">
          <div class="relative w-32 h-32">
            <!-- 外圈 -->
            <div
              class="absolute inset-0 rounded-full border-4 ring-base"
              :class="{ 'is-matched': isMatched, 'is-connecting': isConnecting, 'is-error': isError }"
            />
            <div
              class="absolute inset-0 rounded-full border-4 border-transparent ring-spinner"
              :class="{ 'is-matched': isMatched, 'is-connecting': isConnecting, 'is-error': isError }"
            />
            <!-- 內圈圖標 -->
            <div class="absolute inset-4 rounded-full bg-gray-800/80 flex items-center justify-center">
              <!-- 錯誤圖標 -->
              <svg
                v-if="isError"
                class="w-12 h-12 icon-color is-error"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
              <!-- 連線/搜尋/配對圖標 -->
              <svg
                v-else
                class="w-12 h-12 icon-color"
                :class="{ 'is-matched': isMatched, 'is-connecting': isConnecting }"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
              </svg>
            </div>
          </div>
        </div>

        <!-- 主標題：h-10 (40px)，不換行 -->
        <h2
          class="text-2xl font-bold tracking-wide h-10 leading-none flex items-center justify-center whitespace-nowrap title-color"
          :class="{ 'is-matched': isMatched, 'is-connecting': isConnecting, 'is-error': isError }"
        >
          {{ titleText }}
        </h2>

        <!-- 副標題：h-6 (24px) -->
        <p class="text-xs font-medium tracking-widest text-gray-300 uppercase h-6 flex items-center justify-center">
          {{ subtitleText }}
        </p>

        <!--
          底部區域：所有狀態統一 h-24 (96px)
          內部使用 flex 置中，內容不同但外框高度一致
        -->
        <div class="h-24 mt-4 flex flex-col items-center justify-center">
          <!-- 搜尋狀態：顯示計時器 -->
          <template v-if="uiPhase === 'searching'">
            <p class="text-xs text-gray-500 tracking-wider mb-1">
              ELAPSED TIME
            </p>
            <p class="text-2xl font-mono text-white">
              {{ displayedSeconds }}s
            </p>
          </template>

          <!-- 錯誤狀態：顯示詳細訊息和重整按鈕 -->
          <template v-else-if="isError">
            <p class="text-xs text-gray-400 mb-3">
              {{ matchmakingStore.errorMessage || 'Unable to connect to server.' }}
            </p>
            <button
              type="button"
              class="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
              @click="handleRefresh"
            >
              Refresh Page
            </button>
          </template>

          <!-- 其他狀態（connecting, matched）：空白 -->
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

/* connecting 狀態 - 使用藍色 */
.ring-base.is-connecting {
  border-color: rgb(59 130 246 / 0.3); /* blue-500/30 */
}

.ring-spinner.is-connecting {
  border-top-color: rgb(96 165 250); /* blue-400 */
}

.icon-color.is-connecting {
  color: rgb(96 165 250); /* blue-400 */
}

.title-color.is-connecting {
  color: rgb(96 165 250); /* blue-400 */
}

/* error 狀態 - 使用紅色，停止旋轉 */
.ring-base.is-error {
  border-color: rgb(239 68 68 / 0.3); /* red-500/30 */
}

.ring-spinner.is-error {
  border-top-color: rgb(248 113 113); /* red-400 */
  animation: none;
  visibility: hidden;
}

.icon-color.is-error {
  color: rgb(248 113 113); /* red-400 */
}

.title-color.is-error {
  color: rgb(248 113 113); /* red-400 */
}
</style>
