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
import DecisionModal from './GamePage/components/DecisionModal.vue'
import ErrorToast from './GamePage/components/ErrorToast.vue'
import GameFinishedModal from './GamePage/components/GameFinishedModal.vue'
import RoundEndModal from './GamePage/components/RoundEndModal.vue'
import ReconnectionBanner from './GamePage/components/ReconnectionBanner.vue'
import AnimationLayer from './GamePage/components/AnimationLayer.vue'
import ConfirmationHint from './GamePage/components/ConfirmationHint.vue'
import ActionPanel from '../components/ActionPanel.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import { TOKENS } from '../user-interface/adapter/di/tokens'
import { useZoneRegistration } from '../user-interface/adapter/composables/useZoneRegistration'
import { useLeaveGame } from '../user-interface/adapter/composables/useLeaveGame'

// 虛擬對手手牌區域（在 viewport 上方，用於發牌動畫目標）
const { elementRef: opponentHandRef } = useZoneRegistration('opponent-hand')

const gameState = useGameStateStore()
const uiState = useUIStateStore()

const { opponentHandCount, fieldCards } = storeToRefs(gameState)
const { infoMessage, handCardConfirmationMode, handCardAwaitingConfirmation } = storeToRefs(uiState)

// T043 [US3]: Leave Game 功能
const {
  isActionPanelOpen,
  isConfirmDialogOpen,
  menuItems,
  toggleActionPanel,
  closeActionPanel,
  handleLeaveGameConfirm,
  handleLeaveGameCancel,
} = useLeaveGame({ requireConfirmation: true })

// GamePage 不再直接調用業務 Port，由子組件負責

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

// GamePage 只作為協調者，不處理業務邏輯
// 所有場牌點擊邏輯已移至 FieldZone 組件內部處理
function handleFieldCardClick(cardId: string) {
  console.info('[GamePage] 場牌點擊事件（已由 FieldZone 處理）:', cardId)
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
    <header class="h-[10%] min-h-12 relative">
      <TopInfoBar />

      <!-- T043 [US3]: Menu Button -->
      <button
        data-testid="menu-button"
        aria-label="Open menu"
        class="absolute top-2 right-4 p-2 rounded-lg hover:bg-white/10 transition-colors"
        @click="toggleActionPanel"
      >
        <!-- Hamburger Icon -->
        <svg
          class="h-6 w-6 text-white"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>
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
      <PlayerHandZone />
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

    <!-- T072-T076 [US3]: Koi-Koi Decision Modal -->
    <DecisionModal />

    <!-- T089-T091 [US4]: Game Finished Modal -->
    <GameFinishedModal />

    <!-- T024-T028 [US3]: Round End Modal -->
    <RoundEndModal />

    <!-- 動畫層：跨容器動畫支援 -->
    <AnimationLayer />

    <!-- 底部提示：兩次點擊確認模式 -->
    <ConfirmationHint />

    <!-- T043 [US3]: Action Panel -->
    <ActionPanel
      :is-open="isActionPanelOpen"
      :items="menuItems"
      @close="closeActionPanel"
    />

    <!-- T043 [US3]: Leave Game Confirmation Dialog -->
    <ConfirmDialog
      :is-open="isConfirmDialogOpen"
      title="Leave Game"
      message="Are you sure you want to leave this game? Your progress will be lost."
      confirm-text="Leave"
      cancel-text="Cancel"
      @confirm="handleLeaveGameConfirm"
      @cancel="handleLeaveGameCancel"
    />
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
