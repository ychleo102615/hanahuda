<script setup lang="ts">
/**
 * GamePage - 遊戲主頁面
 *
 * @description
 * 遊戲介面響應式設計：
 * - 大螢幕：各區域按比例填滿 viewport（100vh）
 * - 小螢幕：各區域使用最小高度，頁面可垂直滾動
 *
 * Gateway Architecture:
 * - 頁面載入時建立單一 Gateway SSE 連線
 * - Gateway 自動處理配對和遊戲事件
 * - 後端推送 GatewayConnected 事件決定初始狀態
 * - 重連由 GatewayEventClient 自動處理
 */

// Nuxt 4: 定義頁面 middleware
definePageMeta({
  middleware: 'game',
})

import { ref, onMounted, onUnmounted } from 'vue'
import { resolveDependency, tryResolveDependency } from '~/user-interface/adapter/di/resolver'
import type { MockEventEmitter } from '~/user-interface/adapter/mock/MockEventEmitter'
import type { SessionContextPort } from '~/user-interface/application/ports/output'
import type { MatchmakingApiClient } from '~/user-interface/adapter/api/MatchmakingApiClient'
import { useAuthStore } from '~/identity/adapter/stores/auth-store'
import GameTopInfoBar from './components/GameTopInfoBar.vue'
import FieldZone from './components/FieldZone.vue'
import PlayerHandZone from './components/PlayerHandZone.vue'
import OpponentDepositoryZone from './components/OpponentDepositoryZone.vue'
import PlayerDepositoryZone from './components/PlayerDepositoryZone.vue'
import DeckZone from './components/DeckZone.vue'
import DecisionModal from './components/DecisionModal.vue'
import GameFinishedModal from './components/GameFinishedModal.vue'
import RedirectModal from './components/RedirectModal.vue'
import RoundEndModal from './components/RoundEndModal.vue'
import AnimationLayer from './components/AnimationLayer.vue'
import GameAnnouncement from './components/GameAnnouncement.vue'
import UnifiedToast from '~/components/UnifiedToast.vue'
import ConfirmationHint from './components/ConfirmationHint.vue'
import ConfirmDialog from '~/components/ConfirmDialog.vue'
import PlayerInfoCard from '~/components/PlayerInfoCard.vue'
import MatchmakingStatusOverlay from './components/MatchmakingStatusOverlay.vue'
import { TOKENS } from '~/user-interface/adapter/di/tokens'
import { useZoneRegistration } from '~/user-interface/adapter/composables/useZoneRegistration'
import { useLeaveGame } from '~/user-interface/adapter/composables/useLeaveGame'
import { useGameMode } from '~/user-interface/adapter/composables/useGameMode'
import { usePageVisibility } from '~/user-interface/adapter/composables/usePageVisibility'
import { useGatewayConnection } from '~/user-interface/adapter/composables/useGatewayConnection'
import { useCurrentPlayer } from '~/identity/adapter/composables/use-current-player'
import { useMatchmakingStateStore } from '~/user-interface/adapter/stores/matchmakingState'

// 虛擬對手手牌區域（在 viewport 上方，用於發牌動畫目標）
const { elementRef: opponentHandRef } = useZoneRegistration('opponent-hand')

// DI 注入
const sessionContext = resolveDependency<SessionContextPort>(TOKENS.SessionContextPort)
const gameMode = useGameMode()

// Auth Store（用於檢查登入狀態）
const authStore = useAuthStore()

// 配對狀態（011-online-matchmaking）
const matchmakingStore = useMatchmakingStateStore()

// MatchmakingApiClient（用於取消配對）
const matchmakingApiClient = gameMode === 'backend'
  ? tryResolveDependency<MatchmakingApiClient>(TOKENS.MatchmakingApiClient)
  : null

// Gateway SSE 連線（Backend 模式）
const gatewayConnection = gameMode === 'backend' ? useGatewayConnection() : null

// 頁面可見性監控（自動重連）
usePageVisibility()

// Mock Event Emitter 注入（僅 Mock 模式）
const mockEventEmitter = gameMode === 'mock'
  ? tryResolveDependency<MockEventEmitter>(TOKENS.MockEventEmitter)
  : null

// T043 [US3]: Leave Game 功能
const {
  isConfirmDialogOpen,
  menuItems,
  handleLeaveGameConfirm,
  handleLeaveGameCancel,
} = useLeaveGame({
  requireConfirmation: true,
})

// Identity BC - 玩家資訊
const { displayName, isGuest } = useCurrentPlayer()

// Player Info Card 狀態
const isPlayerInfoCardOpen = ref(false)
const gameTopInfoBarRef = ref<InstanceType<typeof GameTopInfoBar> | null>(null)

// 玩家資訊小卡控制
const handlePlayerClick = () => {
  isPlayerInfoCardOpen.value = !isPlayerInfoCardOpen.value
}

const handlePlayerInfoCardClose = () => {
  isPlayerInfoCardOpen.value = false
}

// 取消配對
const handleCancelMatchmaking = async () => {
  const entryId = sessionContext.getEntryId()
  if (entryId && matchmakingApiClient) {
    try {
      await matchmakingApiClient.cancelMatchmaking(entryId)
    } finally {
      // 清除所有配對相關資訊（roomTypeId + entryId）
      sessionContext.clearSession()
      matchmakingStore.clearSession()
      navigateTo('/lobby')
    }
  }
}

onMounted(() => {
  // 檢查是否已登入
  if (!authStore.isLoggedIn) {
    navigateTo('/lobby')
    return
  }

  // 根據模式建立連線
  if (gameMode === 'backend' && gatewayConnection) {
    // Backend 模式：建立 Gateway SSE 連線
    // Gateway 自動處理配對和遊戲事件
    gatewayConnection.connect()
  } else if (gameMode === 'mock' && mockEventEmitter) {
    // Mock 模式：啟動事件腳本
    mockEventEmitter.start()
  }
})

onUnmounted(() => {
  // 斷開 Gateway 連線（Backend 模式）
  if (gatewayConnection) {
    gatewayConnection.disconnect()
  }

  // 重置 Mock 事件發射器（Mock 模式）
  if (mockEventEmitter) {
    mockEventEmitter.reset()
  }
})
</script>

<template>
  <div class="h-[max(100dvh,730px)] w-full flex flex-col bg-green-900 overflow-y-auto overflow-x-hidden overscroll-x-none relative pt-[env(safe-area-inset-top)]">
    <!-- 虛擬對手手牌區域（viewport 上方，用於發牌動畫目標） -->
    <div
      ref="opponentHandRef"
      class="fixed w-full h-24"
      style="top: -150px; left: 0;"
      aria-hidden="true"
    />

    <!-- 頂部資訊列 (fixed 定位，捲動時仍可見) -->
    <!-- 高度由 CSS 變數 --game-topbar-height 控制 -->
    <header class="fixed top-[env(safe-area-inset-top)] left-0 right-0 h-(--game-topbar-height) z-40">
      <GameTopInfoBar
        ref="gameTopInfoBarRef"
        :menu-items="menuItems"
        @player-click="handlePlayerClick"
      />
    </header>

    <!-- 佔位：補償 fixed header 的高度 -->
    <div class="h-(--game-topbar-height) shrink-0" />

    <!-- 主遊戲區域：填滿剩餘空間，四區按 15:30:15:30 比例分配 -->
    <div class="flex-1 flex flex-col min-h-0">
      <!-- 對手已獲得牌區 (flex-[15]) -->
      <section class="flex-15 bg-gray-700/50 overflow-x-auto min-h-0">
        <OpponentDepositoryZone />
      </section>

      <!-- 場中央牌區 (flex-[30]) -->
      <section class="flex-30 bg-green-800/50 flex min-h-0">
        <FieldZone class="flex-1" />
        <!-- DeckZone：大螢幕正常顯示，小螢幕 fixed 定位（內部響應式處理） -->
        <DeckZone />
      </section>

      <!-- 玩家已獲得牌區 (flex-[15]) -->
      <section class="flex-15 bg-gray-700/50 overflow-x-auto min-h-0">
        <PlayerDepositoryZone />
      </section>

      <!-- 玩家手牌區 (flex-[30]) -->
      <section class="flex-30 bg-gray-800/50 min-h-0">
        <PlayerHandZone />
      </section>
    </div>

    <!-- Unified Toast Notification -->
    <UnifiedToast />

    <!-- T072-T076 [US3]: Koi-Koi Decision Modal -->
    <DecisionModal />

    <!-- T089-T091 [US4]: Game Finished Modal -->
    <GameFinishedModal />

    <!-- Redirect Modal (取代 Game Error Modal) -->
    <RedirectModal />

    <!-- T024-T028 [US3]: Round End Modal -->
    <RoundEndModal />

    <!-- 動畫層：跨容器動畫支援 -->
    <AnimationLayer />

    <!-- 遊戲公告動畫（Koi-Koi、役種） -->
    <GameAnnouncement />

    <!-- 底部提示：兩次點擊確認模式 -->
    <ConfirmationHint />

    <!-- Player Info Card (純資訊展示) -->
    <PlayerInfoCard
      :is-open="isPlayerInfoCardOpen"
      :display-name="displayName"
      :is-guest="isGuest"
      :anchor-ref="gameTopInfoBarRef?.playerAvatarRef"
      @close="handlePlayerInfoCardClose"
    />

    <!-- T043 [US3]: Leave Game Confirmation Dialog -->
    <ConfirmDialog
      :is-open="isConfirmDialogOpen"
      title="Leave Game"
      message="The game is still in progress. Are you sure you want to leave?"
      confirm-text="Leave"
      cancel-text="Cancel"
      @confirm="handleLeaveGameConfirm"
      @cancel="handleLeaveGameCancel"
    />

    <!-- 011-online-matchmaking: 配對狀態覆蓋層 -->
    <MatchmakingStatusOverlay @cancel="handleCancelMatchmaking" />
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
