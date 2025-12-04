<template>
  <div ref="depositoryRef" class="opponent-depository-zone w-full h-full overflow-x-auto">
    <div class="flex gap-4 p-2 min-w-min h-full">
      <!-- 四個分組區塊：光牌 → 種牌 → 短冊 → かす -->
      <div
        v-for="group in cardGroups"
        :key="group.type"
        class="depository-group flex flex-col min-w-[60px]"
      >
        <!-- 分組標題 -->
        <div class="text-xs text-gray-400 mb-1 text-center">
          {{ group.label }}
          <span v-if="group.cards.length > 0" class="text-gray-500">({{ group.cards.length }})</span>
        </div>

        <!-- 卡片列表 -->
        <div class="flex gap-1 flex-wrap justify-center flex-1 items-center">
          <CardComponent
            v-for="cardId in group.cards"
            :key="cardId"
            :card-id="cardId"
            :is-selectable="false"
            :is-selected="false"
            :is-highlighted="false"
            size="sm"
            class="shrink-0"
          />

        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * OpponentDepositoryZone Component
 *
 * @description
 * 顯示對手已獲得的牌，按卡片類型分組。
 * 分組順序：光牌 → 種牌 → 短冊 → かす
 *
 * Features:
 * - 按卡片類型分組顯示（BRIGHT, ANIMAL, RIBBON, PLAIN）
 * - 支援橫向滾動
 * - 使用小尺寸卡片（節省空間）
 * - 卡片不可選擇
 * - 空分組保持佔位
 */

import { computed } from 'vue'
import { useGameStateStore } from '~/user-interface/adapter/stores/gameState'
import { useZoneRegistration } from '~/user-interface/adapter/composables/useZoneRegistration'
import CardComponent from './CardComponent.vue'
import type { CardType } from '~/user-interface/domain/types'

const gameStateStore = useGameStateStore()

// 註冊區域位置
const { elementRef: depositoryRef } = useZoneRegistration('opponent-depository')

interface CardGroup {
  type: CardType
  label: string
  cards: readonly string[]
}

/**
 * 分組顯示資料
 */
const cardGroups = computed<CardGroup[]>(() => {
  const grouped = gameStateStore.groupedOpponentDepository
  return [
    { type: 'BRIGHT', label: '光', cards: grouped.BRIGHT },
    { type: 'ANIMAL', label: '種', cards: grouped.ANIMAL },
    { type: 'RIBBON', label: '短冊', cards: grouped.RIBBON },
    { type: 'PLAIN', label: 'かす', cards: grouped.PLAIN },
  ]
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
