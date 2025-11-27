<script setup lang="ts">
/**
 * FieldZone - 場中央牌區
 *
 * @description
 * 顯示場上 8 張卡片，支援配對高亮。
 * 新增兩次點擊確認架構：
 * - 懸浮預覽高亮（紫色框）
 * - 單一配對高亮（綠色框 + 輕微閃爍）
 * - 多重配對高亮（橙色框 + 明顯閃爍）
 */

import { computed, inject } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStateStore } from '../../../user-interface/adapter/stores/gameState'
import { useUIStateStore } from '../../../user-interface/adapter/stores/uiState'
import { useZoneRegistration } from '../../../user-interface/adapter/composables/useZoneRegistration'
import CardComponent from './CardComponent.vue'
import { TOKENS } from '../../../user-interface/adapter/di/tokens'
import type { SelectMatchTargetPort, PlayHandCardPort } from '../../../user-interface/application/ports/input'

const gameState = useGameStateStore()
const uiState = useUIStateStore()

// 註冊區域位置
const { elementRef: fieldRef } = useZoneRegistration('field')

const { fieldCards } = storeToRefs(gameState)
const {
  selectionMode,
  selectionPossibleTargets,
  previewHighlightedTargets,
  fieldCardSelectionMode,
  fieldCardSelectableTargets,
  fieldCardHighlightType,
  handCardConfirmationMode,
  matchableFieldCards,
  matchCount,
} = storeToRefs(uiState)

// 注入 Ports
const selectMatchTargetPort = inject<SelectMatchTargetPort>(
  TOKENS.SelectMatchTargetPort.toString()
)
const playHandCardPort = inject<PlayHandCardPort>(
  TOKENS.PlayHandCardPort.toString()
)

// 判斷卡片是否為可配對目標（舊架構，保留向後兼容）
function isHighlighted(cardId: string): boolean {
  return selectionMode.value && selectionPossibleTargets.value.includes(cardId)
}

// 判斷卡片是否可選擇（舊架構，保留向後兼容）
function isSelectable(cardId: string): boolean {
  return selectionMode.value && selectionPossibleTargets.value.includes(cardId)
}

// 判斷卡片是否為懸浮預覽高亮（紫色框）
// 只在懸浮且沒有進入確認模式時顯示
function isPreviewHighlighted(cardId: string): boolean {
  if (handCardConfirmationMode.value || fieldCardSelectionMode.value) {
    return false
  }
  return previewHighlightedTargets.value.includes(cardId)
}

// 判斷卡片是否為單一配對高亮（綠色框 + 輕微閃爍）
function isSingleMatchHighlight(cardId: string): boolean {
  // 情境 1: 翻牌選擇模式（AWAITING_SELECTION）
  if (fieldCardSelectionMode.value && fieldCardHighlightType.value === 'single') {
    return fieldCardSelectableTargets.value.includes(cardId)
  }

  // 情境 2: 手牌確認模式（兩次點擊）
  if (handCardConfirmationMode.value && matchCount.value === 1) {
    return matchableFieldCards.value.includes(cardId)
  }

  return false
}

// 判斷卡片是否為多重配對高亮（橙色框 + 明顯閃爍）
function isMultipleMatchHighlight(cardId: string): boolean {
  // 情境 1: 翻牌選擇模式（AWAITING_SELECTION）
  if (fieldCardSelectionMode.value && fieldCardHighlightType.value === 'multiple') {
    return fieldCardSelectableTargets.value.includes(cardId)
  }

  // 情境 2: 手牌確認模式（兩次點擊）
  if (handCardConfirmationMode.value && matchCount.value > 1) {
    return matchableFieldCards.value.includes(cardId)
  }

  return false
}

// 處理卡片點擊
function handleCardClick(cardId: string) {
  // 情境 1: 翻牌選擇模式（AWAITING_SELECTION）
  if (fieldCardSelectionMode.value && fieldCardSelectableTargets.value.includes(cardId)) {
    if (selectMatchTargetPort) {
      // 從 gameState 取得完整參數
      const drawnCard = gameState.drawnCard
      const possibleTargets = gameState.possibleTargetCardIds

      if (!drawnCard || possibleTargets.length === 0) {
        console.error('[FieldZone] Missing drawnCard or possibleTargets for AWAITING_SELECTION')
        return
      }

      selectMatchTargetPort.execute({
        sourceCardId: drawnCard,
        targetCardId: cardId,
        possibleTargets: possibleTargets
      })
      uiState.exitFieldCardSelectionMode()
    } else {
      console.warn('[FieldZone] SelectMatchTargetPort not injected')
    }
    return
  }

  // 情境 2: 手牌確認模式（兩次點擊） - 點擊場牌來配對
  if (handCardConfirmationMode.value && matchableFieldCards.value.includes(cardId)) {
    if (playHandCardPort && uiState.handCardAwaitingConfirmation) {
      const selectedHandCard = uiState.handCardAwaitingConfirmation
      console.info('[FieldZone] 手牌確認模式 - 執行配對:', { selectedHandCard, fieldCard: cardId })

      playHandCardPort.execute({
        cardId: selectedHandCard,
        handCards: gameState.myHandCards,
        fieldCards: gameState.fieldCards,
        targetCardId: cardId,
      })
      uiState.exitHandCardConfirmationMode()
    } else {
      console.warn('[FieldZone] PlayHandCardPort not injected or no handCard awaiting')
    }
    return
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
        :is-selectable="
          isSelectable(cardId) ||
          (fieldCardSelectionMode && fieldCardSelectableTargets.includes(cardId)) ||
          (handCardConfirmationMode && matchableFieldCards.includes(cardId))
        "
        :is-preview-highlighted="isPreviewHighlighted(cardId)"
        :is-single-match-highlight="isSingleMatchHighlight(cardId)"
        :is-multiple-match-highlight="isMultipleMatchHighlight(cardId)"
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

/* 新卡片淡入 - 已註釋，避免與動畫層衝突 */
/* .field-cards-enter-active {
  transition: opacity 200ms ease-in;
}

.field-cards-enter-from {
  opacity: 0;
} */

/* 移除 leave 動畫 - 讓卡片直接消失 */
.field-cards-leave-active {
  position: absolute;
  opacity: 0;
}
</style>
