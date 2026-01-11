<script setup lang="ts">
/**
 * FieldZone - 場中央牌區
 *
 * @description
 * 顯示場上 8 張卡片，支援配對高亮。
 * 使用 flex-wrap 佈局，寬度不足時自動換行擴展高度。
 *
 * 高亮模式：
 * - 懸浮預覽高亮（紫色框）
 * - 單一配對高亮（綠色框 + 輕微閃爍）
 * - 多重配對高亮（橙色框 + 明顯閃爍）
 */

import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStateStore } from '~/user-interface/adapter/stores/gameState'
import { useUIStateStore } from '~/user-interface/adapter/stores/uiState'
import { useZoneRegistration } from '~/user-interface/adapter/composables/useZoneRegistration'
import { resolveDependency } from '~/user-interface/adapter/di/resolver'
import CardComponent from './CardComponent.vue'
import { TOKENS } from '~/user-interface/adapter/di/tokens'
import type { SelectMatchTargetPort, PlayHandCardPort } from '~/user-interface/application/ports/input'

const gameState = useGameStateStore()
const uiState = useUIStateStore()

// 註冊區域位置
const { elementRef: fieldRef } = useZoneRegistration('field')

const { fieldCards } = storeToRefs(gameState)
const {
  previewHighlightedTargets,
  fieldCardSelectionMode,
  fieldCardSelectableTargets,
  fieldCardHighlightType,
  handCardConfirmationMode,
  matchableFieldCards,
  matchCount,
  isActionTimeoutExpired,
} = storeToRefs(uiState)

/**
 * 玩家是否可以選擇場牌
 *
 * @description
 * 當操作時間超時時，禁止場牌選擇操作。
 * 此條件與 PlayerHandZone 的 canPlayerAct 類似，
 * 但場牌選擇有自己的模式判斷邏輯。
 */
const canSelectFieldCard = computed(() => !isActionTimeoutExpired.value)

// 注入 Ports
const selectMatchTargetPort = resolveDependency<SelectMatchTargetPort>(TOKENS.SelectMatchTargetPort)
const playHandCardPort = resolveDependency<PlayHandCardPort>(TOKENS.PlayHandCardPort)

// 判斷卡片是否為懸浮預覽高亮（紫色框）
function isPreviewHighlighted(cardId: string): boolean {
  // 場牌選擇模式（翻牌多重配對）時不顯示預覽高亮
  if (fieldCardSelectionMode.value) {
    return false
  }
  // 手牌確認模式時，若此卡片已在當前配對高亮中，不重複顯示預覽
  // 這避免橙色/綠色框與紫色框重疊
  if (handCardConfirmationMode.value && matchableFieldCards.value.includes(cardId)) {
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
  // 前置條件檢查：操作超時時禁止選擇
  if (!canSelectFieldCard.value) return

  // 情境 1: 翻牌選擇模式（AWAITING_SELECTION）
  if (fieldCardSelectionMode.value && fieldCardSelectableTargets.value.includes(cardId)) {
    // 從 gameState 取得完整參數
    const drawnCard = gameState.drawnCard
    const possibleTargets = gameState.possibleTargetCardIds

    if (!drawnCard || possibleTargets.length === 0) {
      return
    }

    selectMatchTargetPort.execute({
      sourceCardId: drawnCard,
      targetCardId: cardId,
      possibleTargets: possibleTargets
    })
    uiState.exitFieldCardSelectionMode()
    return
  }

  // 情境 2: 手牌確認模式（兩次點擊） - 點擊場牌來配對
  if (handCardConfirmationMode.value && matchableFieldCards.value.includes(cardId)) {
    if (!uiState.handCardAwaitingConfirmation) {
      return
    }

    const selectedHandCard = uiState.handCardAwaitingConfirmation

    playHandCardPort.execute({
      cardId: selectedHandCard,
      handCards: gameState.myHandCards,
      fieldCards: gameState.fieldCards,
      targetCardId: cardId,
    })
    uiState.exitHandCardConfirmationMode()
    return
  }
}

</script>

<template>
  <div class="field-zone-container h-full">
    <div ref="fieldRef" class="field-zone-inner h-full flex items-center p-4 overflow-x-auto">
      <TransitionGroup
        name="field-cards"
        tag="div"
        class="grid grid-flow-col grid-rows-2 gap-4 mx-auto"
      >
        <CardComponent
          v-for="cardId in fieldCards"
          :key="cardId"
          :card-id="cardId"
          :is-selectable="
            canSelectFieldCard &&
            ((fieldCardSelectionMode && fieldCardSelectableTargets.includes(cardId)) ||
            (handCardConfirmationMode && matchableFieldCards.includes(cardId)))
          "
          :is-preview-highlighted="isPreviewHighlighted(cardId)"
          :is-single-match-highlight="isSingleMatchHighlight(cardId)"
          :is-multiple-match-highlight="isMultipleMatchHighlight(cardId)"
          size="auto"
          @click="handleCardClick"
        />
      </TransitionGroup>
    </div>
  </div>
</template>

<style scoped>
/* Container Query 支援動態卡片大小 */
.field-zone-container {
  container-type: size;
  container-name: field-zone;
}

@container field-zone (height > 0px) {
  .field-zone-inner {
    /* 計算卡片高度：(容器高度 - padding - gap) / 2 行 * 0.9 */
    --card-height: clamp(3rem, calc((100cqh - 2rem - 1rem) / 2) * 0.9, 10rem);
  }
}

/* FLIP 動畫 - 只動畫 transform */
.field-cards-move {
  transition: transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* 移除 leave 動畫 - 讓卡片直接消失 */
.field-cards-leave-active {
  position: absolute;
  opacity: 0;
}
</style>
