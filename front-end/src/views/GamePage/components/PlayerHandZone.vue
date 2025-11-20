<script setup lang="ts">
/**
 * PlayerHandZone - 玩家手牌區
 *
 * @description
 * 顯示玩家手牌，支援選擇。
 */

import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStateStore } from '../../../user-interface/adapter/stores/gameState'
import CardComponent from './CardComponent.vue'

const gameState = useGameStateStore()
const { myHandCards, isMyTurn } = storeToRefs(gameState)

const selectedCardId = ref<string | null>(null)

const emit = defineEmits<{
  cardSelect: [cardId: string]
}>()

// 處理手牌點擊
function handleCardClick(cardId: string) {
  if (!isMyTurn.value) return

  selectedCardId.value = cardId
  emit('cardSelect', cardId)
}

// 判斷卡片是否被選中
function isSelected(cardId: string): boolean {
  return selectedCardId.value === cardId
}

// 清除選擇（供外部呼叫）
function clearSelection() {
  selectedCardId.value = null
}

defineExpose({
  clearSelection,
})
</script>

<template>
  <div class="h-full flex items-center justify-center p-4 overflow-x-auto">
    <div class="flex gap-2">
      <CardComponent
        v-for="cardId in myHandCards"
        :key="cardId"
        :card-id="cardId"
        :is-selectable="isMyTurn"
        :is-selected="isSelected(cardId)"
        size="lg"
        @click="handleCardClick"
      />
      <div
        v-if="myHandCards.length === 0"
        class="text-gray-500 text-sm"
      >
        無手牌
      </div>
    </div>
  </div>
</template>
