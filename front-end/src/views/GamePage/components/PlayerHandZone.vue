<script setup lang="ts">
/**
 * PlayerHandZone - 玩家手牌區
 *
 * @description
 * 顯示玩家手牌，支援選擇。
 * T054 [US2]: 添加 click handlers for card selection
 * T058 [US2]: 注入 PlayHandCardPort
 */

import { ref, inject } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStateStore } from '../../../user-interface/adapter/stores/gameState'
import { useUIStateStore } from '../../../user-interface/adapter/stores/uiState'
import CardComponent from './CardComponent.vue'
import { TOKENS } from '../../../user-interface/adapter/di/tokens'
import type { PlayHandCardPort } from '../../../user-interface/application/ports/input'
import type { DomainFacade } from '../../../user-interface/application/types/domain-facade'
import { getCardById } from '../../../user-interface/domain'

const gameState = useGameStateStore()
const uiState = useUIStateStore()
const { myHandCards, isMyTurn, fieldCards } = storeToRefs(gameState)

const selectedCardId = ref<string | null>(null)

// T058 [US2]: 注入 PlayHandCardPort
const playHandCardPort = inject<PlayHandCardPort>(
  TOKENS.PlayHandCardPort.toString()
)

// 通過 DI 獲取 DomainFacade
const domainFacade = inject<DomainFacade>(
  TOKENS.DomainFacade.toString()
)

const emit = defineEmits<{
  cardSelect: [cardId: string]
}>()

// T054 [US2]: 處理手牌點擊
function handleCardClick(cardId: string) {
  if (!isMyTurn.value) return
  if (!domainFacade) {
    console.warn('[PlayerHandZone] DomainFacade not injected')
    return
  }

  selectedCardId.value = cardId

  // 將 cardId 轉換為 Card 物件
  const handCard = getCardById(cardId)
  if (!handCard) {
    console.warn('[PlayerHandZone] Card not found:', cardId)
    return
  }

  const fieldCardObjects = fieldCards.value
    .map(id => getCardById(id))
    .filter((card): card is NonNullable<typeof card> => card !== undefined)

  // 使用 DomainFacade 找出可配對的場牌
  const matchableCards = domainFacade.findMatchableCards(handCard, fieldCardObjects)
  const matchableCardIds = matchableCards.map(card => card.card_id)

  if (matchableCardIds.length === 0) {
    // 無配對，直接打出（卡片放到場上）
    if (playHandCardPort) {
      playHandCardPort.execute({
        cardId,
        handCards: myHandCards.value,
        fieldCards: fieldCards.value,
      })
    }
  } else if (matchableCardIds.length === 1) {
    // 只有一張配對，直接選擇
    if (playHandCardPort) {
      playHandCardPort.execute({
        cardId,
        handCards: myHandCards.value,
        fieldCards: fieldCards.value,
      })
    }
  } else {
    // 多張配對，顯示選擇 UI
    uiState.selectionSourceCard = cardId
    uiState.showSelectionUI(matchableCardIds)
  }

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
        No cards
      </div>
    </div>
  </div>
</template>
