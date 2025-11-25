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

</script>

<template>
  <div ref="fieldRef" class="h-full flex items-center justify-center p-4">
    <TransitionGroup
      name="field-cards"
      tag="div"
      class="grid grid-cols-4 gap-4"
    >
      <CardComponent
        v-for="cardId in fieldCards"
        :key="cardId"
        :card-id="cardId"
        :is-highlighted="isHighlighted(cardId)"
        :is-selectable="isSelectable(cardId)"
        size="md"
        @click="handleCardClick"
      />
    </TransitionGroup>
  </div>
</template>

<style scoped>
/* FLIP 動畫 - 只動畫 transform */
.field-cards-move {
  transition: transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* 新卡片淡入（無配對時加入場牌） */
.field-cards-enter-active {
  transition: opacity 200ms ease-in;
}

.field-cards-enter-from {
  opacity: 0;
}

/* 移除 leave 動畫 - 讓卡片直接消失 */
.field-cards-leave-active {
  position: absolute;
  opacity: 0;
}
</style>
