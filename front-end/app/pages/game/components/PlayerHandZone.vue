<script setup lang="ts">
/**
 * PlayerHandZone - 玩家手牌區
 *
 * @description
 * 顯示玩家手牌，支援選擇。
 * 使用 flex-wrap 佈局，寬度不足時自動換行擴展高度。
 */

import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStateStore } from '~/user-interface/adapter/stores/gameState'
import { useUIStateStore } from '~/user-interface/adapter/stores/uiState'
import { useAnimationLayerStore } from '~/user-interface/adapter/stores/animationLayerStore'
import { useZoneRegistration } from '~/user-interface/adapter/composables/useZoneRegistration'
import { useDependency } from '~/user-interface/adapter/composables/useDependency'
import CardComponent from './CardComponent.vue'
import { TOKENS } from '~/user-interface/adapter/di/tokens'
import type { PlayHandCardPort } from '~/user-interface/application/ports/input'
import type { DomainFacade } from '~/user-interface/application/types/domain-facade'
import { getCardById } from '~/user-interface/domain'

const gameState = useGameStateStore()
const uiState = useUIStateStore()
const animationLayerStore = useAnimationLayerStore()

// 註冊區域位置
const { elementRef: handRef } = useZoneRegistration('player-hand')
const { myHandCards, isMyTurn, fieldCards } = storeToRefs(gameState)
const { handCardAwaitingConfirmation, isActionTimeoutExpired, isSubmittingAction } = storeToRefs(uiState)
const { isAnimating } = storeToRefs(animationLayerStore)

// T058 [US2]: 注入 PlayHandCardPort
const playHandCardPort = useDependency<PlayHandCardPort>(TOKENS.PlayHandCardPort)

// 通過 DI 獲取 DomainFacade
const domainFacade = useDependency<DomainFacade>(TOKENS.DomainFacade)

// 從 gameState 取得 flowStage（用於 canPlayerAct 判斷）
const { flowStage, possibleTargetCardIds } = storeToRefs(gameState)

/**
 * 玩家是否可以操作手牌
 *
 * @description
 * 整合所有操作前置條件（全部為響應式狀態）：
 * 1. 是我的回合（isMyTurn）
 * 2. 沒有動畫正在播放（!isAnimating）
 * 3. 處於等待出手牌階段（flowStage === 'AWAITING_HAND_PLAY'）
 * 4. 操作時間未超時（!isActionTimeoutExpired）
 * 5. 沒有正在提交的操作（!isSubmittingAction，防止弱網重複點擊）
 */
const canPlayerAct = computed(() => {
  return (
    isMyTurn.value &&
    !isAnimating.value &&
    flowStage.value === 'AWAITING_HAND_PLAY' &&
    !isActionTimeoutExpired.value &&
    !isSubmittingAction.value
  )
})

const emit = defineEmits<{
  cardSelect: [cardId: string]
}>()

// 處理手牌點擊（兩次點擊確認）
function handleCardClick(cardId: string) {
  // 前置條件檢查（使用統一的 canPlayerAct）
  if (!canPlayerAct.value) return

  // 第一次點擊：進入確認模式
  if (handCardAwaitingConfirmation.value !== cardId) {
    const handCard = getCardById(cardId)
    if (!handCard) {
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
    return
  }

  const fieldCardObjects = fieldCards.value
    .map(id => getCardById(id))
    .filter((card): card is NonNullable<typeof card> => card !== undefined)

  const matchableCards = domainFacade.findMatchableCards(handCard, fieldCardObjects)
  const matchableCardIds = matchableCards.map(card => card.card_id)

  if (matchableCardIds.length !== 2) {
    // 非雙重配對：直接執行（無配對、單一配對、三重配對）
    // 設定提交狀態，防止弱網環境下重複點擊
    uiState.setSubmittingAction(true)
    playHandCardPort.execute({
      cardId,
      handCards: myHandCards.value,
      fieldCards: fieldCards.value,
    })
    uiState.exitHandCardConfirmationMode()
  } else {
    // 雙重配對：必須選擇配對目標
  }
}

// 處理滑鼠進入手牌（懸浮預覽）
function handleMouseEnter(cardId: string) {
  // 前置條件檢查（使用統一的 canPlayerAct）
  if (!canPlayerAct.value) return

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

// 監聽回合變化，非玩家回合時清除所有高亮狀態與提交狀態
import { watch } from 'vue'
watch(isMyTurn, (newIsMyTurn) => {
  if (!newIsMyTurn) {
    // 清除手牌確認模式
    if (uiState.handCardConfirmationMode) {
      uiState.exitHandCardConfirmationMode()
    }
    // 清除懸浮預覽高亮（解決游標停留時回合切換的問題）
    uiState.clearHandCardHoverPreview()
    // 清除提交狀態（回合結束時重置）
    uiState.setSubmittingAction(false)
  }
})

// 監聽 FlowStage 變化，處理 AWAITING_SELECTION 狀態
// 當 HandleSelectionRequiredUseCase 設定 FlowStage 為 AWAITING_SELECTION 時，
// 根據 possibleTargetCardIds 數量來決定 UI 行為
// 注意：只有自己的回合才進入選擇模式
watch(flowStage, (newStage, oldStage) => {
  // 當 flowStage 從 AWAITING_HAND_PLAY 變化時，清除提交狀態（表示伺服器已回應）
  if (oldStage === 'AWAITING_HAND_PLAY' && newStage !== 'AWAITING_HAND_PLAY') {
    uiState.setSubmittingAction(false)
  }

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

  } else if (oldStage === 'AWAITING_SELECTION' && newStage !== 'AWAITING_SELECTION') {
    // 離開場牌選擇模式（當 FlowStage 變化時自動清除）
    uiState.exitFieldCardSelectionMode()
  }
})

defineExpose({
  clearSelection,
})
</script>

<template>
  <div ref="handRef" class="card-zone-container h-full flex items-center justify-center p-4">
    <TransitionGroup
      v-if="myHandCards.length > 0"
      name="hand-cards"
      tag="div"
      class="flex flex-wrap justify-center gap-3"
    >
      <CardComponent
        v-for="cardId in myHandCards"
        :key="cardId"
        :card-id="cardId"
        :is-selectable="canPlayerAct"
        :is-selected="isSelected(cardId)"
        size="auto"
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
/* Container Query 支援動態卡片大小 */
.card-zone-container {
  container-type: size;
  container-name: hand-zone;
}

@container hand-zone (height > 0px) {
  .card-zone-container {
    /* 計算卡片高度：容器高度 - padding * 0.85 */
    --card-height: clamp(3rem, calc(100cqh - 2rem) * 0.85, 8rem);
  }
}

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
