<script setup lang="ts">
/**
 * TopInfoBar - 頂部資訊列
 *
 * @description
 * 顯示遊戲分數、回合資訊、控制按鈕。
 */

import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStateStore } from '../../../user-interface/adapter/stores/gameState'
import { useUIStateStore } from '../../../user-interface/adapter/stores/uiState'

const gameState = useGameStateStore()
const uiState = useUIStateStore()

const { myScore, opponentScore, isMyTurn, deckRemaining } = storeToRefs(gameState)
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
      return 'text-green-600'
    case 'connecting':
      return 'text-yellow-600'
    case 'disconnected':
      return 'text-red-600'
    default:
      return ''
  }
})

// 回合提示
const turnText = computed(() => {
  return isMyTurn.value ? 'Your Turn' : "Opponent's Turn"
})

// 倒數顯示樣式（低於 5 秒警示）
const countdownClass = computed(() => {
  if (actionTimeoutRemaining.value !== null && actionTimeoutRemaining.value <= 5) {
    return 'text-red-500'
  }
  return 'text-white'
})
</script>

<template>
  <div class="h-full bg-gray-800 text-white px-4 py-2 flex items-center justify-between">
    <!-- Left: Opponent score -->
    <div class="flex items-center gap-4">
      <div class="text-center">
        <div class="text-xs text-gray-400">Opponent</div>
        <div class="text-xl font-bold">{{ opponentScore }}</div>
      </div>
    </div>

    <!-- Center: Game status -->
    <div class="flex flex-col items-center">
      <div class="text-sm font-medium" :class="{ 'text-yellow-400': isMyTurn }">
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
    </div>

    <!-- Right: Player score and status -->
    <div class="flex items-center gap-4">
      <div class="text-center">
        <div class="text-xs text-gray-400">You</div>
        <div class="text-xl font-bold">{{ myScore }}</div>
      </div>
      <div class="text-xs" :class="connectionStatusClass">
        {{ connectionStatusText }}
      </div>
    </div>
  </div>
</template>
