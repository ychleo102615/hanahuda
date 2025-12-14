<script setup lang="ts">
/**
 * PlayerHandZone - 玩家手牌區
 *
 * @description
 * 顯示玩家手牌，支援選擇。
 * T054 [US2]: 添加 click handlers for card selection
 * T058 [US2]: 注入 PlayHandCardPort
 */

import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStateStore } from '~/user-interface/adapter/stores/gameState'
import { useUIStateStore } from '~/user-interface/adapter/stores/uiState'
import { useZoneRegistration } from '~/user-interface/adapter/composables/useZoneRegistration'
import { useDependency } from '~/user-interface/adapter/composables/useDependency'
import CardComponent from './CardComponent.vue'
import { TOKENS } from '~/user-interface/adapter/di/tokens'
import type { PlayHandCardPort } from '~/user-interface/application/ports/input'
import type { DomainFacade } from '~/user-interface/application/types/domain-facade'
import type { AnimationPort } from '~/user-interface/application/ports/output'
import { getCardById } from '~/user-interface/domain'

const gameState = useGameStateStore()
const uiState = useUIStateStore()

// 註冊區域位置
const { elementRef: handRef } = useZoneRegistration('player-hand')
const { myHandCards, isMyTurn, fieldCards } = storeToRefs(gameState)
const { handCardAwaitingConfirmation } = storeToRefs(uiState)

// T058 [US2]: 注入 PlayHandCardPort
const playHandCardPort = useDependency<PlayHandCardPort>(TOKENS.PlayHandCardPort)

// 通過 DI 獲取 DomainFacade
const domainFacade = useDependency<DomainFacade>(TOKENS.DomainFacade)

// 注入 AnimationPort 用於檢查動畫狀態
const animationPort = useDependency<AnimationPort>(TOKENS.AnimationPort)

const emit = defineEmits<{
  cardSelect: [cardId: string]
}>()

// 處理手牌點擊（兩次點擊確認）
function handleCardClick(cardId: string) {
  // 前置條件檢查
  if (!isMyTurn.value) return
  if (animationPort.isAnimating()) return
  // 只有在等待出手牌階段才允許出牌
  if (flowStage.value !== 'AWAITING_HAND_PLAY') return

  // 第一次點擊：進入確認模式
  if (handCardAwaitingConfirmation.value !== cardId) {
    const handCard = getCardById(cardId)
    if (!handCard) {
      console.warn('[PlayerHandZone] Card not found:', cardId)
      return
    }

    const fieldCardObjects = fieldCards.value
      .map(id => getCardById(id))
      .filter((card): card is NonNullable<typeof card> => card !== undefined)

    const matchableCards = domainFacade.findMatchableCards(handCard, fieldCardObjects)
    const matchableCardIds = matchableCards.map(card => card.card_id)

    uiState.enterHandCardConfirmationMode(cardId, matchableCardIds, matchableCardIds.length)
    emit('cardSelect', cardId)
    return
  }

  // 第二次點擊同一張牌：執行打牌邏輯
  const handCard = getCardById(cardId)
  if (!handCard) {
    console.warn('[PlayerHandZone] Card not found:', cardId)
    return
  }

  const fieldCardObjects = fieldCards.value
    .map(id => getCardById(id))
    .filter((card): card is NonNullable<typeof card> => card !== undefined)

  const matchableCards = domainFacade.findMatchableCards(handCard, fieldCardObjects)
  const matchableCardIds = matchableCards.map(card => card.card_id)

  if (matchableCardIds.length === 0 || matchableCardIds.length === 1) {
    // 無配對或單一配對：直接執行
    playHandCardPort.execute({
      cardId,
      handCards: myHandCards.value,
      fieldCards: fieldCards.value,
    })
    uiState.exitHandCardConfirmationMode()
  } else {
    // 多張配對：觸發震動，不執行任何操作
    // 震動動畫通過 CardComponent 的 enableShake prop 觸發
    console.info('[PlayerHandZone] Multiple matches, please click field card')
  }
}

// 處理滑鼠進入手牌（懸浮預覽）
function handleMouseEnter(cardId: string) {
  if (!isMyTurn.value) return
  if (animationPort.isAnimating()) return

  // 只有在等待出手牌階段才顯示懸浮高亮
  // 出牌後進入其他階段（AWAITING_DECK_DRAW、AWAITING_SELECTION 等）時不顯示
  if (flowStage.value !== 'AWAITING_HAND_PLAY') return

  // 如果是已選中的手牌，不顯示預覽高亮
  if (handCardAwaitingConfirmation.value === cardId) {
    return
  }

  const handCard = getCardById(cardId)
  if (!handCard) return

  const fieldCardObjects = fieldCards.value
    .map(id => getCardById(id))
    .filter((card): card is NonNullable<typeof card> => card !== undefined)

  const matchableCards = domainFacade.findMatchableCards(handCard, fieldCardObjects)
  const matchableCardIds = matchableCards.map(card => card.card_id)

  uiState.setHandCardHoverPreview(cardId, matchableCardIds)
}

// 處理滑鼠離開手牌
function handleMouseLeave() {
  uiState.clearHandCardHoverPreview()
}

// 判斷卡片是否被選中
function isSelected(cardId: string): boolean {
  return handCardAwaitingConfirmation.value === cardId
}

// 清除選擇（供外部呼叫）
function clearSelection() {
  uiState.exitHandCardConfirmationMode()
}

// 監聽回合變化，非玩家回合時清除所有高亮狀態
import { watch } from 'vue'
watch(isMyTurn, (newIsMyTurn) => {
  if (!newIsMyTurn) {
    // 清除手牌確認模式
    if (uiState.handCardConfirmationMode) {
      uiState.exitHandCardConfirmationMode()
    }
    // 清除懸浮預覽高亮（解決游標停留時回合切換的問題）
    uiState.clearHandCardHoverPreview()
  }
})

// 監聽 FlowStage 變化，處理 AWAITING_SELECTION 狀態
// 當 HandleSelectionRequiredUseCase 設定 FlowStage 為 AWAITING_SELECTION 時，
// 根據 possibleTargetCardIds 數量來決定 UI 行為
// 注意：只有自己的回合才進入選擇模式
const { flowStage, possibleTargetCardIds } = storeToRefs(gameState)
watch(flowStage, (newStage, oldStage) => {
  // 只有自己的回合才進入選擇模式
  if (newStage === 'AWAITING_SELECTION' && possibleTargetCardIds.value.length > 0 && isMyTurn.value) {
    // 進入場牌選擇模式
    const sourceCard = possibleTargetCardIds.value[0] ?? ''
    const highlightType = possibleTargetCardIds.value.length === 1 ? 'single' : 'multiple'

    // 退出手牌確認模式（如果存在）
    if (uiState.handCardConfirmationMode) {
      uiState.exitHandCardConfirmationMode()
    }

    // 進入場牌選擇模式
    uiState.enterFieldCardSelectionMode(
      sourceCard,
      possibleTargetCardIds.value,
      highlightType
    )

    console.info('[PlayerHandZone] 進入場牌選擇模式:', {
      targets: possibleTargetCardIds.value,
      highlightType,
    })
  } else if (oldStage === 'AWAITING_SELECTION' && newStage !== 'AWAITING_SELECTION') {
    // 離開場牌選擇模式（當 FlowStage 變化時自動清除）
    uiState.exitFieldCardSelectionMode()
    console.info('[PlayerHandZone] 離開場牌選擇模式')
  }
})

defineExpose({
  clearSelection,
})
</script>

<template>
  <div ref="handRef" class="h-full flex items-center justify-center p-4 overflow-x-auto">
    <TransitionGroup
      v-if="myHandCards.length > 0"
      name="hand-cards"
      tag="div"
      class="flex gap-3"
    >
      <CardComponent
        v-for="cardId in myHandCards"
        :key="cardId"
        :card-id="cardId"
        :is-selectable="isMyTurn"
        :is-selected="isSelected(cardId)"
        size="lg"
        @click="handleCardClick"
        @mouseenter="handleMouseEnter(cardId)"
        @mouseleave="handleMouseLeave"
      />
    </TransitionGroup>
    <div
      v-else
      class="text-gray-500 text-sm"
    >
      No cards
    </div>
  </div>
</template>

<style scoped>
/* FLIP 動畫 */
.hand-cards-move {
  transition: transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* 移除 leave 動畫 - 讓卡片直接消失並脫離文檔流 */
.hand-cards-leave-active {
  position: absolute;
  opacity: 0;
}
</style>
