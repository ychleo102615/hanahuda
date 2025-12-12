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
// Nuxt 4: 定義頁面 middleware
definePageMeta({
  middleware: 'lobby',
})

import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useMatchmakingStateStore } from '~/user-interface/adapter/stores/matchmakingState'
import { useDependency, useOptionalDependency } from '~/user-interface/adapter/composables/useDependency'
import { useSSEConnection } from '~/user-interface/adapter/composables/useSSEConnection'
import { TOKENS } from '~/user-interface/adapter/di/tokens'
import type { StartGamePort } from '~/user-interface/application/ports/input'
import type { MockEventEmitter } from '~/user-interface/adapter/mock/MockEventEmitter'
import ActionPanel from '~/components/ActionPanel.vue'
import TopInfoBar from '~/components/TopInfoBar.vue'
import type { ActionPanelItem } from '~/components/ActionPanel.vue'
import { useGameMode } from '~/user-interface/adapter/composables/useGameMode'

// Pinia Store
const matchmakingStore = useMatchmakingStateStore()

// Use Case 注入
const startGameUseCase = useDependency<StartGamePort>(TOKENS.StartGamePort)

// 遊戲模式（從 runtimeConfig 取得，單一真相來源）
const gameMode = useGameMode()

// SSE 連線管理（Backend 模式）
const { connect: connectSSE } = useSSEConnection()

// Mock Event Emitter 注入（僅 Mock 模式）
const mockEventEmitter = gameMode === 'mock'
  ? useOptionalDependency<MockEventEmitter>(TOKENS.MockEventEmitter)
  : null

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
  navigateTo('/')
  closePanel()
}

// 生成 UUID
const generateUUID = (): string => {
  return crypto.randomUUID()
}

// 開始配對
const handleFindMatch = async () => {
  if (!canStartMatchmaking.value) return

  try {
    // 1. 設定狀態為 finding
    matchmakingStore.setStatus('finding')

    // 2. 啟動倒數計時器
    startCountdown()

    // 3. 調用 StartGameUseCase（生成 playerId，使用預設名稱）
    const playerId = sessionStorage.getItem('player_id') || generateUUID()
    const playerName = 'Player' // 未來可由使用者輸入
    await startGameUseCase.execute({ playerId, playerName })

    console.info('[GameLobby] 遊戲啟動成功')

    // 4. 根據模式建立連線
    if (gameMode === 'backend') {
      // Backend 模式：建立 SSE 連線（SSE-First Architecture）
      // session_token 由 HttpOnly Cookie 自動傳送
      const gameId = matchmakingStore.gameId

      if (gameId) {
        console.info('[GameLobby] 建立 SSE 連線', { playerId, playerName, gameId })
        connectSSE({
          playerId,
          playerName,
          gameId,
        })
      } else {
        console.warn('[GameLobby] 無法建立 SSE 連線：缺少 gameId')
      }
    } else if (gameMode === 'mock' && mockEventEmitter) {
      // Mock 模式：啟動事件腳本
      console.info('[GameLobby] 啟動 Mock 事件腳本')
      mockEventEmitter.start()
    }

  } catch (error) {
    console.error('[GameLobby] 遊戲啟動失敗:', error)

    // 清除計時器
    clearCountdownTimer()

    // 設定錯誤狀態
    matchmakingStore.setStatus('error')
    matchmakingStore.setErrorMessage(
      error instanceof Error
        ? error.message
        : 'Failed to join matchmaking. Please try again.'
    )
  }
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
  <div class="min-h-screen bg-green-900 flex flex-col">
    <!-- 頂部資訊列 -->
    <header class="h-14 shrink-0">
      <TopInfoBar variant="lobby" @menu-click="togglePanel" />
    </header>

    <!-- 主要內容區 -->
    <main class="flex-1 flex items-center justify-center p-4">
      <div class="max-w-4xl w-full">
        <!-- 卡片清單容器（加入邊框與內邊距） -->
        <div class="border-2 border-gray-700/50 rounded-xl p-6 bg-gray-900/20">
          <div class="grid gap-6 md:grid-cols-2">

            <!-- 快速配對卡片（橫跨整行，固定高度） -->
            <div class="md:col-span-2 bg-gray-800/80 backdrop-blur-sm rounded-lg shadow-xl p-6 border border-gray-700 min-h-[380px] grid grid-rows-[auto_1fr_auto]">
              <!-- 1. 標題區（固定） -->
              <h2 class="text-xl font-bold text-white pb-4 border-b border-gray-600">
                Quick Match
              </h2>

              <!-- 2. 內容區（彈性、垂直居中） -->
              <div class="flex items-center justify-center py-6">
                <div class="w-full space-y-6">
                  <!-- Idle 狀態 -->
                  <div v-if="isIdle" class="space-y-6">
                    <p class="text-center text-gray-300">
                      Ready to play? Click below to find a match!
                    </p>

                    <button
                      data-testid="find-match-button"
                      aria-label="Find a match to play"
                      class="w-full bg-primary-600 hover:bg-primary-500 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
                          class="animate-spin h-6 w-6 text-primary-400"
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
                        <span class="text-lg font-medium text-white">Finding Match...</span>
                      </div>

                      <!-- 倒數計時器 -->
                      <div
                        data-testid="matchmaking-countdown"
                        aria-live="polite"
                        class="text-4xl font-bold tabular-nums"
                        :class="isCountdownWarning ? 'text-red-500 warning' : 'text-primary-400'"
                      >
                        {{ countdown }}
                      </div>
                      <p class="text-sm text-gray-400 mt-2">seconds remaining</p>
                    </div>

                    <!-- 禁用的 Find Match 按鈕 -->
                    <button
                      data-testid="find-match-button"
                      class="w-full bg-gray-600 text-gray-400 font-semibold py-3 px-6 rounded-lg cursor-not-allowed opacity-50"
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
                      class="bg-red-900/30 border border-red-700 rounded-lg p-4"
                    >
                      <div class="flex items-start">
                        <!-- Error Icon -->
                        <svg
                          class="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0"
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
                          <h3 class="text-sm font-medium text-red-300">Matchmaking Failed</h3>
                          <p class="mt-1 text-sm text-red-400">
                            {{ matchmakingStore.errorMessage || 'An error occurred. Please try again.' }}
                          </p>
                        </div>
                      </div>
                    </div>

                    <!-- 重試按鈕 -->
                    <button
                      data-testid="retry-button"
                      aria-label="Retry matchmaking"
                      class="w-full bg-primary-600 hover:bg-primary-500 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
                      @click="handleRetry"
                    >
                      Retry
                    </button>

                    <!-- 禁用的 Find Match 按鈕 -->
                    <button
                      data-testid="find-match-button"
                      class="w-full bg-gray-600 text-gray-400 font-semibold py-3 px-6 rounded-lg cursor-not-allowed opacity-50"
                      disabled
                    >
                      Find Match
                    </button>
                  </div>
                </div>
              </div>

              <!-- 3. 說明區（固定底部） -->
              <div class="pt-6 border-t border-gray-600">
                <p class="text-sm text-gray-400 text-center">
                  You will be matched with an opponent and the game will start automatically.
                </p>
              </div>
            </div>

          <!-- Coming Soon 預覽卡片：自訂房間 -->
          <div class="relative bg-gray-800/40 backdrop-blur-sm rounded-lg shadow-xl p-6 border border-gray-700/50 opacity-60">
            <!-- Coming Soon 徽章 -->
            <div class="absolute top-4 right-4 bg-primary-600/80 text-white text-xs font-bold px-3 py-1 rounded-full">
              Coming Soon
            </div>

            <!-- 卡片標題 -->
            <h2 class="text-xl font-bold text-gray-400 mb-6 pb-4 border-b border-gray-600/50">
              Custom Room
            </h2>

            <p class="text-center text-gray-400 mb-6">
              Create or join a custom game room
            </p>

            <button
              disabled
              class="w-full bg-gray-700 text-gray-500 font-semibold py-3 px-6 rounded-lg cursor-not-allowed"
            >
              Browse Rooms
            </button>
          </div>

          <!-- 未來擴展：遊戲規則設定卡片 -->
          <!--
          <div class="bg-gray-800/80 backdrop-blur-sm rounded-lg shadow-xl p-6 border border-gray-700">
            <h2 class="text-xl font-bold text-white mb-6 pb-4 border-b border-gray-600">
              Game Settings
            </h2>
            <p class="text-center text-gray-300 mb-6">
              Customize game rules and scoring
            </p>
            <button class="w-full bg-primary-600 hover:bg-primary-500 text-white font-semibold py-3 px-6 rounded-lg">
              Configure
            </button>
          </div>
          -->

          </div>
        </div>
      </div>
    </main>

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
