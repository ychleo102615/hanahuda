<template>
  <div class="opponent-depository-zone w-full h-full overflow-x-auto">
    <div
      v-if="opponentCards.length === 0"
      class="flex items-center justify-center h-full text-gray-400 text-sm"
    >
      No cards captured yet
    </div>

    <div v-else class="flex gap-2 p-2 min-w-min">
      <CardComponent
        v-for="cardId in opponentCards"
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
 * OpponentDepositoryZone Component
 *
 * @description
 * 顯示對手已獲得的牌。
 * 從 GameStateStore 讀取對手的 depository 狀態。
 *
 * Features:
 * - 顯示對手所有已獲得的牌
 * - 支援橫向滾動
 * - 使用小尺寸卡片（節省空間）
 * - 卡片不可選擇
 */

import { computed } from 'vue'
import { useGameStateStore } from '@/user-interface/adapter/stores/gameState'
import CardComponent from './CardComponent.vue'

const gameStateStore = useGameStateStore()

/**
 * 取得對手已獲得的牌
 */
const opponentCards = computed<string[]>(() => {
  return gameStateStore.opponentDepository
})
</script>

<style scoped>
.opponent-depository-zone {
  /* 啟用橫向滾動 */
  scrollbar-width: thin;
  scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
}

.opponent-depository-zone::-webkit-scrollbar {
  height: 6px;
}

.opponent-depository-zone::-webkit-scrollbar-track {
  background: transparent;
}

.opponent-depository-zone::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.5);
  border-radius: 3px;
}

.opponent-depository-zone::-webkit-scrollbar-thumb:hover {
  background-color: rgba(156, 163, 175, 0.7);
}
</style>
