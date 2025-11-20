<template>
  <div class="player-depository-zone w-full h-full overflow-x-auto">
    <div
      v-if="playerCards.length === 0"
      class="flex items-center justify-center h-full text-gray-400 text-sm"
    >
      No cards captured yet
    </div>

    <div v-else class="flex gap-2 p-2 min-w-min">
      <CardComponent
        v-for="cardId in playerCards"
        :key="cardId"
        :card-id="cardId"
        :is-selectable="false"
        :is-selected="false"
        :is-highlighted="false"
        size="sm"
        class="flex-shrink-0"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * PlayerDepositoryZone Component
 *
 * @description
 * 顯示玩家已獲得的牌。
 * 從 GameStateStore 讀取玩家的 depository 狀態。
 *
 * Features:
 * - 顯示玩家所有已獲得的牌
 * - 支援橫向滾動
 * - 使用小尺寸卡片（節省空間）
 * - 卡片不可選擇
 * - 可視覺化顯示已形成的役種（optional，Phase 7+）
 */

import { computed } from 'vue'
import { useGameStateStore } from '@/user-interface/adapter/stores/gameState'
import CardComponent from './CardComponent.vue'

const gameStateStore = useGameStateStore()

/**
 * 取得玩家已獲得的牌
 */
const playerCards = computed<string[]>(() => {
  return gameStateStore.myDepository
})
</script>

<style scoped>
.player-depository-zone {
  /* 啟用橫向滾動 */
  scrollbar-width: thin;
  scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
}

.player-depository-zone::-webkit-scrollbar {
  height: 6px;
}

.player-depository-zone::-webkit-scrollbar-track {
  background: transparent;
}

.player-depository-zone::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.5);
  border-radius: 3px;
}

.player-depository-zone::-webkit-scrollbar-thumb:hover {
  background-color: rgba(156, 163, 175, 0.7);
}
</style>
