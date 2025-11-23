<script setup lang="ts">
/**
 * FieldZone - 場中央牌區
 *
 * @description
 * 顯示場上 8 張卡片，支援配對高亮。
 */

import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStateStore } from '../../../user-interface/adapter/stores/gameState'
import { useUIStateStore } from '../../../user-interface/adapter/stores/uiState'
import { useZoneRegistration } from '../../../user-interface/adapter/composables/useZoneRegistration'
import CardComponent from './CardComponent.vue'

const gameState = useGameStateStore()
const uiState = useUIStateStore()

// 註冊區域位置
const { elementRef: fieldRef } = useZoneRegistration('field')

const { fieldCards } = storeToRefs(gameState)
const { selectionMode, selectionPossibleTargets } = storeToRefs(uiState)

const emit = defineEmits<{
  cardClick: [cardId: string]
}>()

// 判斷卡片是否為可配對目標
function isHighlighted(cardId: string): boolean {
  return selectionMode.value && selectionPossibleTargets.value.includes(cardId)
}

// 判斷卡片是否可選擇
function isSelectable(cardId: string): boolean {
  return selectionMode.value && selectionPossibleTargets.value.includes(cardId)
}

// 處理卡片點擊
function handleCardClick(cardId: string) {
  if (isSelectable(cardId)) {
    emit('cardClick', cardId)
  }
}

// 填充空位到 8 張
const displayCards = computed(() => {
  const cards = [...fieldCards.value]
  while (cards.length < 8) {
    cards.push('')
  }
  return cards
})
</script>

<template>
  <div ref="fieldRef" class="h-full flex items-center justify-center p-4">
    <div class="grid grid-cols-4 grid-rows-2 gap-4">
      <template v-for="(cardId, index) in displayCards" :key="index">
        <CardComponent
          v-if="cardId"
          :card-id="cardId"
          :is-highlighted="isHighlighted(cardId)"
          :is-selectable="isSelectable(cardId)"
          size="md"
          @click="handleCardClick"
        />
      </template>
    </div>
  </div>
</template>
