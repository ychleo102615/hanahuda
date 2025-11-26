<script setup lang="ts">
/**
 * GamePage - 遊戲主頁面
 *
 * @description
 * 遊戲介面固定 Viewport 設計（100vh × 100vw，無垂直滾動）。
 * 整合所有遊戲區域組件。
 */

import { ref, onMounted, inject } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStateStore } from '../user-interface/adapter/stores/gameState'
import { useUIStateStore } from '../user-interface/adapter/stores/uiState'
import TopInfoBar from './GamePage/components/TopInfoBar.vue'
import FieldZone from './GamePage/components/FieldZone.vue'
import PlayerHandZone from './GamePage/components/PlayerHandZone.vue'
import OpponentDepositoryZone from './GamePage/components/OpponentDepositoryZone.vue'
import PlayerDepositoryZone from './GamePage/components/PlayerDepositoryZone.vue'
import DeckZone from './GamePage/components/DeckZone.vue'
import SelectionOverlay from './GamePage/components/SelectionOverlay.vue'
import DecisionModal from './GamePage/components/DecisionModal.vue'
import ErrorToast from './GamePage/components/ErrorToast.vue'
import GameFinishedModal from './GamePage/components/GameFinishedModal.vue'
import ReconnectionBanner from './GamePage/components/ReconnectionBanner.vue'
import AnimationLayer from './GamePage/components/AnimationLayer.vue'
import ConfirmationHint from './GamePage/components/ConfirmationHint.vue'
import { TOKENS } from '../user-interface/adapter/di/tokens'
import { useZoneRegistration } from '../user-interface/adapter/composables/useZoneRegistration'

// 虛擬對手手牌區域（在 viewport 上方，用於發牌動畫目標）
const { elementRef: opponentHandRef } = useZoneRegistration('opponent-hand')

const gameState = useGameStateStore()
const uiState = useUIStateStore()

const { opponentHandCount, fieldCards } = storeToRefs(gameState)
const { infoMessage, handCardConfirmationMode, handCardAwaitingConfirmation } = storeToRefs(uiState)

const playerHandZoneRef = ref<InstanceType<typeof PlayerHandZone> | null>(null)

// 注入 Ports
import type { PlayHandCardPort, SelectMatchTargetPort } from '../user-interface/application/ports/input'
const playHandCardPort = inject<PlayHandCardPort>(TOKENS.PlayHandCardPort.toString())
const selectMatchTargetPort = inject<SelectMatchTargetPort>(TOKENS.SelectMatchTargetPort.toString())

// 初始化遊戲
onMounted(async () => {
  const gameMode = sessionStorage.getItem('gameMode') || 'mock'

  if (gameMode === 'mock') {
    console.info('[GamePage] 初始化 Mock 模式')

    // 解析 MockApiClient 和 MockEventEmitter
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockApiClient = inject<{ joinGame: () => Promise<void> }>(TOKENS.SendCommandPort.toString()) as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockEventEmitter = inject<{ start: () => void }>(TOKENS.MockEventEmitter.toString()) as any

    if (mockApiClient && mockEventEmitter) {
      // 調用 joinGame 初始化遊戲
      await mockApiClient.joinGame()

      // 啟動 Mock 事件腳本
      mockEventEmitter.start()
    } else {
      console.error('[GamePage] Mock 模式依賴注入失敗')
    }
  }
})

// 處理手牌選擇
function handleHandCardSelect(cardId: string) {
  console.info('[GamePage] 選擇手牌:', cardId)
  // 手牌選擇邏輯已在 PlayerHandZone 內部處理
}

// 處理場牌點擊（配對選擇）
function handleFieldCardClick(cardId: string) {
  console.info('[GamePage] 場牌點擊:', cardId)

  // 情境 1: 手牌確認模式 - 點擊場牌來配對
  if (handCardConfirmationMode.value && handCardAwaitingConfirmation.value) {
    const selectedHandCard = handCardAwaitingConfirmation.value
    console.info('[GamePage] 手牌確認模式 - 執行配對:', { selectedHandCard, fieldCard: cardId })

    if (playHandCardPort) {
      playHandCardPort.execute({
        cardId: selectedHandCard,
        handCards: gameState.myHandCards,
        fieldCards: fieldCards.value,
        targetCardId: cardId, // 指定配對目標
      })
      uiState.exitHandCardConfirmationMode()
    } else {
      console.warn('[GamePage] PlayHandCardPort not injected')
    }
    return
  }

  // 情境 2: 翻牌選擇模式（舊架構）- SelectMatchTargetPort
  if (selectMatchTargetPort) {
    selectMatchTargetPort.execute({ targetCardId: cardId })
  } else {
    console.warn('[GamePage] SelectMatchTargetPort not injected')
  }

  // 清除選擇狀態
  playerHandZoneRef.value?.clearSelection()
}
</script>

<template>
  <div class="h-screen w-screen flex flex-col bg-green-900 overflow-hidden">
    <!-- 虛擬對手手牌區域（viewport 上方，用於發牌動畫目標） -->
    <div
      ref="opponentHandRef"
      class="fixed w-full h-24"
      style="top: -150px; left: 0;"
      aria-hidden="true"
    />

    <!-- 頂部資訊列 (~10% viewport) -->
    <header class="h-[10%] min-h-12">
      <TopInfoBar />
    </header>

    <!-- 對手已獲得牌區 (~15% viewport) -->
    <section class="h-[15%] bg-gray-700/50 overflow-x-auto">
      <OpponentDepositoryZone />
    </section>

    <!-- 場中央牌區 (~30% viewport) -->
    <section class="h-[30%] bg-green-800/50 flex">
      <FieldZone class="flex-1" @card-click="handleFieldCardClick" />
      <DeckZone class="w-24 shrink-0" />
    </section>

    <!-- 玩家已獲得牌區 (~15% viewport) -->
    <section class="h-[15%] bg-gray-700/50 overflow-x-auto">
      <PlayerDepositoryZone />
    </section>

    <!-- 玩家手牌區 (~30% viewport) -->
    <section class="h-[30%] bg-gray-800/50">
      <PlayerHandZone ref="playerHandZoneRef" @card-select="handleHandCardSelect" />
    </section>

    <!-- Opponent hand count indicator -->
    <div class="fixed top-20 left-4 bg-black/70 text-white px-3 py-1 rounded text-sm">
      Opponent Hand: {{ opponentHandCount }}
    </div>

    <!-- T088-T090 [US4]: Error Toast -->
    <ErrorToast />

    <!-- 資訊訊息 Toast -->
    <Transition name="fade">
      <div
        v-if="infoMessage"
        class="fixed bottom-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg"
      >
        {{ infoMessage }}
      </div>
    </Transition>

    <!-- T109-T111 [US5]: Reconnection Banner -->
    <ReconnectionBanner />

    <!-- T057 [US2]: Selection Overlay for multiple match targets -->
    <SelectionOverlay @target-selected="handleFieldCardClick" />

    <!-- T072-T076 [US3]: Koi-Koi Decision Modal -->
    <DecisionModal />

    <!-- T089-T091 [US4]: Game Finished Modal -->
    <GameFinishedModal />

    <!-- 動畫層：跨容器動畫支援 -->
    <AnimationLayer />

    <!-- 底部提示：兩次點擊確認模式 -->
    <ConfirmationHint />
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
