<!--
  TopInfoBar.vue - 統一頂部資訊列元件

  @description
  支援 GamePage 和 GameLobby 兩種模式的頂部資訊列。

  Props:
  - variant: 'game' | 'lobby' - 顯示模式
  - title: string - lobby 模式的標題（預設 'Game Lobby'）

  Slots:
  - left: 自訂左側區域
  - center: 自訂中間區域
  - right: 自訂右側區域

  Events:
  - menuClick: 選單按鈕點擊事件
-->

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStateStore } from '~/user-interface/adapter/stores/gameState'
import { useUIStateStore } from '~/user-interface/adapter/stores/uiState'

interface Props {
  variant: 'game' | 'lobby'
  title?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Game Lobby',
})

const emit = defineEmits<{
  menuClick: []
}>()

// 只在 game 模式使用 stores
const gameState = useGameStateStore()
const uiState = useUIStateStore()

const {
  myScore,
  opponentScore,
  turnStatus,
  localPlayerName,
  opponentPlayerName,
  currentFlowStage,
  opponentHandCount,
  myKoiKoiMultiplier,
  opponentKoiKoiMultiplier,
} = storeToRefs(gameState)
const { connectionStatus, actionTimeoutRemaining, waitingForOpponent, reconnecting, gameFinishedModalVisible, dealingInProgress } = storeToRefs(uiState)

// 連線狀態顯示
const connectionStatusText = computed(() => {
  switch (connectionStatus.value) {
    case 'connected':
      return 'Connected'
    case 'connecting':
      return 'Connecting...'
    case 'disconnected':
      return 'Disconnected'
    default:
      return ''
  }
})

const connectionStatusClass = computed(() => {
  switch (connectionStatus.value) {
    case 'connected':
      return 'text-green-400'
    case 'connecting':
      return 'text-yellow-400'
    case 'disconnected':
      return 'text-red-400'
    default:
      return ''
  }
})

// 統一狀態文字（單一行顯示）
const statusText = computed(() => {
  // Priority 1: 等待對手加入
  if (waitingForOpponent.value) return 'Waiting for opponent...'
  // Priority 2: 重連中
  if (reconnecting.value) return 'Reconnecting...'
  // Priority 3: 遊戲結束
  if (gameFinishedModalVisible.value) return 'Game Over'

  // Priority 4: 發牌中
  if (dealingInProgress.value) return 'Dealing...'

  // Priority 5: 回合結束（flowStage 被清除）
  if (!currentFlowStage.value) return 'Round Over'

  const isMyTurn = turnStatus.value === 'my-turn'

  switch (currentFlowStage.value) {
    case 'AWAITING_HAND_PLAY':
      return isMyTurn ? 'Your Turn - Play a card' : 'Opponent is playing...'
    case 'AWAITING_SELECTION':
      return isMyTurn ? 'Your Turn - Select a card' : 'Opponent is selecting...'
    case 'AWAITING_DECISION':
      return isMyTurn ? 'Your Turn - Make decision' : 'Opponent is deciding...'
    default:
      return ''
  }
})

// 狀態文字是否為自己回合（用於高亮樣式）
// 排除發牌中等中立狀態，避免「Dealing...」等訊息被黃色高亮
const isMyTurnStatus = computed(() => {
  return turnStatus.value === 'my-turn'
    && !waitingForOpponent.value
    && !reconnecting.value
    && !gameFinishedModalVisible.value
    && !dealingInProgress.value
})

// 倒數顯示樣式（低於 5 秒警示）
const countdownClass = computed(() => {
  if (actionTimeoutRemaining.value !== null && actionTimeoutRemaining.value <= 5) {
    return 'text-red-500'
  }
  return 'text-white'
})

// 選單按鈕點擊
const handleMenuClick = () => {
  emit('menuClick')
}
</script>

<template>
  <div class="h-full bg-gray-800 text-white px-4 py-2 flex items-center justify-between">
    <!-- Left Section -->
    <div class="flex items-center gap-4">
      <slot name="left">
        <!-- Game 模式：對手區域（兩欄並排） -->
        <template v-if="variant === 'game'">
          <div class="flex items-center gap-4">
            <!-- 分數欄 -->
            <div class="text-center">
              <div class="text-xs text-gray-400">{{ opponentPlayerName || 'Opponent' }}</div>
              <div class="text-xl font-bold">{{ opponentScore }}</div>
              <!-- 狀態列（固定高度防止 layout shift）：Koi-Koi 資訊 -->
              <div class="h-4 flex items-center justify-center">
                <span
                  v-if="opponentKoiKoiMultiplier > 1"
                  class="text-xs text-amber-400"
                >
                  koikoi
                </span>
              </div>
            </div>
            <!-- 手牌數欄 -->
            <div class="flex flex-col items-center gap-1 text-gray-300" title="Opponent hand count">
              <span class="text-sm text-gray-400 font-medium">Cards left</span>
              <span class="text-sm font-medium">{{ opponentHandCount }}</span>
            </div>
          </div>
        </template>
        <!-- Lobby 模式：標題 -->
        <template v-else>
          <h1 data-testid="lobby-title" class="text-xl font-bold">{{ title }}</h1>
        </template>
      </slot>
    </div>

    <!-- Center Section -->
    <div class="flex flex-col items-center">
      <slot name="center">
        <!-- Game 模式：回合資訊 -->
        <template v-if="variant === 'game'">
          <!-- Unified status text -->
          <div
            v-if="statusText"
            class="text-lg font-medium"
            :class="{ 'text-yellow-400': isMyTurnStatus }"
          >
            {{ statusText }}
          </div>
          <!-- Countdown Display (固定高度防止抖動) -->
          <div class="h-7 flex items-center justify-center">
            <span
              v-if="actionTimeoutRemaining !== null"
              class="text-xl font-bold"
              :class="countdownClass"
            >
              {{ actionTimeoutRemaining }}
            </span>
          </div>
        </template>
        <!-- Lobby 模式：預設不顯示中間內容 -->
      </slot>
    </div>

    <!-- Right Section -->
    <div class="flex items-center gap-4">
      <slot name="right">
        <!-- Game 模式：玩家分數和連線狀態 -->
        <template v-if="variant === 'game'">
          <div class="text-center">
            <div class="text-xs text-gray-400">{{ localPlayerName || 'You' }}</div>
            <div class="text-xl font-bold">{{ myScore }}</div>
            <!-- 狀態列（固定高度防止 layout shift）：Koi-Koi 資訊 -->
            <div class="h-4 flex items-center justify-center">
              <span
                v-if="myKoiKoiMultiplier > 1"
                class="text-xs text-amber-400"
              >
                koikoi
              </span>
            </div>
          </div>
          <div class="text-xs" :class="connectionStatusClass">
            {{ connectionStatusText }}
          </div>
        </template>
        <!-- Lobby 模式：選單按鈕 -->
        <template v-else>
          <button
            data-testid="menu-button"
            aria-label="Open menu"
            class="p-2 rounded-lg hover:bg-white/10 transition-colors"
            @click="handleMenuClick"
          >
            <!-- Hamburger Icon -->
            <svg
              class="h-6 w-6 text-white"
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
        </template>
      </slot>
    </div>
  </div>
</template>
