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
const { connectionStatus } = storeToRefs(uiState)

// 連線狀態顯示
const connectionStatusText = computed(() => {
  switch (connectionStatus.value) {
    case 'connected':
      return '已連線'
    case 'connecting':
      return '連線中...'
    case 'disconnected':
      return '未連線'
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
  return isMyTurn.value ? '你的回合' : '對手回合'
})
</script>

<template>
  <div class="h-full bg-gray-800 text-white px-4 py-2 flex items-center justify-between">
    <!-- 左側: 對手分數 -->
    <div class="flex items-center gap-4">
      <div class="text-center">
        <div class="text-xs text-gray-400">對手</div>
        <div class="text-xl font-bold">{{ opponentScore }}</div>
      </div>
    </div>

    <!-- 中間: 遊戲狀態 -->
    <div class="flex flex-col items-center">
      <div class="text-sm font-medium" :class="{ 'text-yellow-400': isMyTurn }">
        {{ turnText }}
      </div>
      <div class="text-xs text-gray-400">
        剩餘: {{ deckRemaining }} 張
      </div>
    </div>

    <!-- 右側: 玩家分數與狀態 -->
    <div class="flex items-center gap-4">
      <div class="text-center">
        <div class="text-xs text-gray-400">你</div>
        <div class="text-xl font-bold">{{ myScore }}</div>
      </div>
      <div class="text-xs" :class="connectionStatusClass">
        {{ connectionStatusText }}
      </div>
    </div>
  </div>
</template>
