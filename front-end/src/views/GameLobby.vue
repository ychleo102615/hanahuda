<!--
  GameLobby.vue - 遊戲大廳頁面

  @description
  使用者在此等待配對，顯示配對狀態並提供操作選項。

  功能:
  - 三種狀態 UI（idle、finding、error）
  - Find Match 按鈕
  - UX 倒數計時器（30秒）
  - 配對錯誤重試按鈕

  狀態流程:
  idle -> finding -> (GameStarted 或 timeout) -> idle/error
  error -> (重試) -> idle
-->

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useMatchmakingStateStore } from '@/user-interface/adapter/stores/matchmakingState'
import ActionPanel from '@/components/ActionPanel.vue'
import type { ActionPanelItem } from '@/components/ActionPanel.vue'

// Pinia Store
const matchmakingStore = useMatchmakingStateStore()

// Vue Router
const router = useRouter()

// Action Panel 狀態
const isPanelOpen = ref(false)

// 倒數計時器
const countdown = ref(30)
let countdownTimer: number | null = null

// Computed properties
const isIdle = computed(() => matchmakingStore.status === 'idle')
const isFinding = computed(() => matchmakingStore.status === 'finding')
const hasError = computed(() => matchmakingStore.status === 'error')
const canStartMatchmaking = computed(() => matchmakingStore.canStartMatchmaking)
const isCountdownWarning = computed(() => countdown.value < 10)

// Action Panel 選單項目
const menuItems = computed<ActionPanelItem[]>(() => [
  {
    id: 'back-home',
    label: 'Back to Home',
    icon: '🏠',
    onClick: handleBackToHome,
  },
])

// 開啟/關閉 Action Panel
const togglePanel = () => {
  isPanelOpen.value = !isPanelOpen.value
}

const closePanel = () => {
  isPanelOpen.value = false
}

// 返回首頁
const handleBackToHome = () => {
  router.push('/')
  closePanel()
}

// 開始配對
const handleFindMatch = () => {
  if (!canStartMatchmaking.value) return

  matchmakingStore.setStatus('finding')
  startCountdown()
}

// 重試配對
const handleRetry = () => {
  matchmakingStore.clearSession()
  // 狀態已重置為 idle，使用者可以再次點擊 Find Match
}

// 開始倒數計時器
const startCountdown = () => {
  countdown.value = 30
  clearCountdownTimer()

  countdownTimer = window.setInterval(() => {
    countdown.value -= 1

    if (countdown.value <= 0) {
      clearCountdownTimer()
      handleMatchmakingTimeout()
    }
  }, 1000)
}

// 清除倒數計時器
const clearCountdownTimer = () => {
  if (countdownTimer !== null) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
}

// 配對超時處理
const handleMatchmakingTimeout = () => {
  matchmakingStore.setStatus('error')
  matchmakingStore.setErrorMessage('Matchmaking timeout. Please try again.')
}

// 監聽狀態變化，清理計時器
watch(() => matchmakingStore.status, (newStatus) => {
  if (newStatus !== 'finding') {
    clearCountdownTimer()
  }
})

// 組件掛載/卸載
onMounted(() => {
  // 如果進入大廳時已經在 finding 狀態，恢復倒數計時器
  if (matchmakingStore.status === 'finding') {
    startCountdown()
  }
})

onUnmounted(() => {
  clearCountdownTimer()
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
    <div class="max-w-md w-full">
      <!-- 大廳卡片 -->
      <div class="bg-white rounded-lg shadow-xl p-8">
        <!-- 標題與選單按鈕 -->
        <div class="flex items-center justify-between mb-8">
          <h1
            data-testid="lobby-title"
            class="text-3xl font-bold text-primary-900"
          >
            Game Lobby
          </h1>

          <!-- 選單按鈕 -->
          <button
            data-testid="menu-button"
            aria-label="Open menu"
            class="p-2 rounded-lg hover:bg-primary-50 transition-colors"
            @click="togglePanel"
          >
            <!-- Hamburger Icon -->
            <svg
              class="h-6 w-6 text-primary-900"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>

        <!-- Idle 狀態 -->
        <div v-if="isIdle" class="space-y-6">
          <p class="text-center text-primary-700 text-lg">
            Ready to play? Click below to find a match!
          </p>

          <button
            data-testid="find-match-button"
            aria-label="Find a match to play"
            class="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="!canStartMatchmaking"
            @click="handleFindMatch"
          >
            Find Match
          </button>
        </div>

        <!-- Finding 狀態 -->
        <div v-if="isFinding" class="space-y-6">
          <!-- 配對中提示 -->
          <div
            data-testid="finding-indicator"
            class="text-center"
          >
            <div class="flex items-center justify-center space-x-2 mb-4">
              <!-- Loading Spinner -->
              <svg
                class="animate-spin h-6 w-6 text-primary-600"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                />
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span class="text-lg font-medium text-primary-900">Finding Match...</span>
            </div>

            <!-- 倒數計時器 -->
            <div
              data-testid="matchmaking-countdown"
              aria-live="polite"
              class="text-4xl font-bold tabular-nums"
              :class="isCountdownWarning ? 'text-red-600 warning' : 'text-primary-600'"
            >
              {{ countdown }}
            </div>
            <p class="text-sm text-primary-600 mt-2">seconds remaining</p>
          </div>

          <!-- 禁用的 Find Match 按鈕 -->
          <button
            data-testid="find-match-button"
            class="w-full bg-primary-300 text-white font-semibold py-3 px-6 rounded-lg cursor-not-allowed opacity-50"
            disabled
          >
            Finding Match...
          </button>
        </div>

        <!-- Error 狀態 -->
        <div v-if="hasError" class="space-y-6">
          <!-- 錯誤訊息 -->
          <div
            data-testid="error-message"
            role="alert"
            class="bg-red-50 border border-red-200 rounded-lg p-4"
          >
            <div class="flex items-start">
              <!-- Error Icon -->
              <svg
                class="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clip-rule="evenodd"
                />
              </svg>
              <div class="flex-1">
                <h3 class="text-sm font-medium text-red-800">Matchmaking Failed</h3>
                <p class="mt-1 text-sm text-red-700">
                  {{ matchmakingStore.errorMessage || 'An error occurred. Please try again.' }}
                </p>
              </div>
            </div>
          </div>

          <!-- 重試按鈕 -->
          <button
            data-testid="retry-button"
            aria-label="Retry matchmaking"
            class="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
            @click="handleRetry"
          >
            Retry
          </button>

          <!-- 禁用的 Find Match 按鈕 -->
          <button
            data-testid="find-match-button"
            class="w-full bg-primary-300 text-white font-semibold py-3 px-6 rounded-lg cursor-not-allowed opacity-50"
            disabled
          >
            Find Match
          </button>
        </div>

        <!-- 說明文字 -->
        <div class="mt-8 pt-6 border-t border-primary-200">
          <p class="text-sm text-primary-600 text-center">
            You will be matched with an opponent and the game will start automatically.
          </p>
        </div>
      </div>
    </div>

    <!-- Action Panel -->
    <ActionPanel
      :is-open="isPanelOpen"
      :items="menuItems"
      @close="closePanel"
    />
  </div>
</template>

<style scoped>
/* 倒數計時器警示動畫 */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.warning {
  animation: pulse 1s ease-in-out infinite;
}

/* Spinner 動畫已由 Tailwind 的 animate-spin 提供 */
</style>
