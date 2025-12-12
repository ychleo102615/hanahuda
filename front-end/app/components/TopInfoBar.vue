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

const { myScore, opponentScore, turnStatus, deckRemaining, localPlayerId, activePlayerId } = storeToRefs(gameState)
const { connectionStatus, actionTimeoutRemaining } = storeToRefs(uiState)

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

// 回合提示
const turnText = computed(() => {
  switch (turnStatus.value) {
    case 'my-turn':
      return 'Your Turn'
    case 'opponent-turn':
      return "Opponent's Turn"
    case 'none':
      return '' // 無活躍玩家時不顯示文字
  }
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
        <!-- Game 模式：對手分數 -->
        <template v-if="variant === 'game'">
          <div class="text-center">
            <div class="text-xs text-gray-400">Opponent</div>
            <div class="text-xl font-bold">{{ opponentScore }}</div>
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
          <div
            v-if="turnText"
            class="text-sm font-medium"
            :class="{ 'text-yellow-400': turnStatus === 'my-turn' }"
          >
            {{ turnText }}
          </div>
          <!-- Countdown Display -->
          <div
            v-if="actionTimeoutRemaining !== null"
            class="text-xl font-bold"
            :class="countdownClass"
          >
            {{ actionTimeoutRemaining }}
          </div>
          <div class="text-xs text-gray-400">
            Deck: {{ deckRemaining }}
          </div>
          <!-- Debug: Player IDs -->
          <div class="text-xs text-gray-500 mt-1">
            [DEBUG] local: {{ localPlayerId?.slice(-4) }} | active: {{ activePlayerId?.slice(-4) }}
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
            <div class="text-xs text-gray-400">You</div>
            <div class="text-xl font-bold">{{ myScore }}</div>
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
