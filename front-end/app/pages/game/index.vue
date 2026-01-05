<script setup lang="ts">
/**
 * GamePage - 遊戲主頁面
 *
 * @description
 * 遊戲介面響應式設計：
 * - 大螢幕：各區域按比例填滿 viewport（100vh）
 * - 小螢幕：各區域使用最小高度，頁面可垂直滾動
 *
 * SSE-First Architecture:
 * - 頁面載入時建立 SSE 連線
 * - 後端推送 InitialState 事件決定顯示內容
 * - 重連由 SSEConnectionManager 自動處理
 */

// Nuxt 4: 定義頁面 middleware
definePageMeta({
  middleware: 'game',
})

import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useDependency, useOptionalDependency } from '~/user-interface/adapter/composables/useDependency'
import type { MockEventEmitter } from '~/user-interface/adapter/mock/MockEventEmitter'
import type { SessionContextPort, GameConnectionPort } from '~/user-interface/application/ports/output'
import type { StartGamePort } from '~/user-interface/application/ports/input'
import GameTopInfoBar from '~/components/GameTopInfoBar.vue'
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
import UnifiedPlayerMenu from '~/components/UnifiedPlayerMenu.vue'
import DeleteAccountModal from '~/components/DeleteAccountModal.vue'
import ConfirmDialog from '~/components/ConfirmDialog.vue'
import PlayerInfoCard from '~/components/PlayerInfoCard.vue'
import { TOKENS } from '~/user-interface/adapter/di/tokens'
import { useZoneRegistration } from '~/user-interface/adapter/composables/useZoneRegistration'
import { useLeaveGame } from '~/user-interface/adapter/composables/useLeaveGame'
import { useGameMode } from '~/user-interface/adapter/composables/useGameMode'
import { usePageVisibility } from '~/user-interface/adapter/composables/usePageVisibility'
import { useCurrentPlayer } from '~/identity/adapter/composables/use-current-player'
import { useAuth } from '~/identity/adapter/composables/use-auth'
import { useUIStateStore } from '~/user-interface/adapter/stores/uiState'

// 虛擬對手手牌區域（在 viewport 上方，用於發牌動畫目標）
const { elementRef: opponentHandRef } = useZoneRegistration('opponent-hand')

// DI 注入
const sessionContext = useDependency<SessionContextPort>(TOKENS.SessionContextPort)
const gameMode = useGameMode()

// 頁面可見性監控（自動重連）
usePageVisibility()

// StartGameUseCase（Backend 模式）
const startGameUseCase = gameMode === 'backend'
  ? useOptionalDependency<StartGamePort>(TOKENS.StartGamePort)
  : null

// GameConnectionPort（用於 onUnmounted 斷開連線）
const gameConnection = gameMode === 'backend'
  ? useOptionalDependency<GameConnectionPort>(TOKENS.GameConnectionPort)
  : null

// Mock Event Emitter 注入（僅 Mock 模式）
const mockEventEmitter = gameMode === 'mock'
  ? useOptionalDependency<MockEventEmitter>(TOKENS.MockEventEmitter)
  : null

// Restart Game 處理函數
function handleRestartGame() {
  if (!startGameUseCase) return
  startGameUseCase.execute({ isNewGame: true })
}

// T043 [US3]: Leave Game 功能
const {
  isActionPanelOpen,
  isConfirmDialogOpen,
  menuItems,
  toggleActionPanel,
  closeActionPanel,
  handleLeaveGameConfirm,
  handleLeaveGameCancel,
} = useLeaveGame({
  requireConfirmation: true,
  onRestartGame: handleRestartGame,
})

// Identity BC - 玩家資訊
const { displayName, isGuest } = useCurrentPlayer()
const { logout, deleteAccount } = useAuth()

// 玩家資訊（傳給 UnifiedPlayerMenu）
const playerInfo = computed(() => ({
  displayName: displayName.value,
  isGuest: isGuest.value,
}))

// Delete Account Modal 狀態
const isDeleteAccountModalOpen = ref(false)
const isDeleteAccountLoading = ref(false)
const deleteAccountError = ref('')

// Player Info Card 狀態
const isPlayerInfoCardOpen = ref(false)
const gameTopInfoBarRef = ref<InstanceType<typeof GameTopInfoBar> | null>(null)

// 登出
const handleLogout = async () => {
  await logout()
  const uiStore = useUIStateStore()
  uiStore.addToast({
    type: 'success',
    message: 'You have been signed out',
    duration: 3000,
    dismissible: false,
  })
  navigateTo('/')
}

// 刪除帳號
const handleOpenDeleteAccountModal = () => {
  isDeleteAccountModalOpen.value = true
  deleteAccountError.value = ''
}

const handleDeleteAccountCancel = () => {
  isDeleteAccountModalOpen.value = false
  deleteAccountError.value = ''
}

const handleDeleteAccountConfirm = async (password: string | undefined) => {
  isDeleteAccountLoading.value = true
  deleteAccountError.value = ''

  try {
    await deleteAccount(password)
    isDeleteAccountModalOpen.value = false
    const uiStore = useUIStateStore()
    uiStore.addToast({
      type: 'success',
      message: 'Your account has been deleted',
      duration: 3000,
      dismissible: false,
    })
    navigateTo('/')
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'data' in error) {
      const errorData = error as { data?: { message?: string } }
      deleteAccountError.value = errorData.data?.message || 'Failed to delete account'
    } else {
      deleteAccountError.value = 'Failed to delete account'
    }
  } finally {
    isDeleteAccountLoading.value = false
  }
}

// 玩家資訊小卡控制
const handlePlayerClick = () => {
  isPlayerInfoCardOpen.value = !isPlayerInfoCardOpen.value
}

const handlePlayerInfoCardClose = () => {
  isPlayerInfoCardOpen.value = false
}

// GamePage 不再直接調用業務 Port，由子組件負責

onMounted(() => {

  // 檢查是否有 playerId
  const playerId = sessionContext.getPlayerId()
  if (!playerId) {
    navigateTo('/lobby')
    return
  }

  // 根據模式建立連線
  if (gameMode === 'backend' && startGameUseCase) {
    // Backend 模式：使用 StartGameUseCase 建立 SSE 連線
    // UseCase 會從 SessionContext 取得所有必要資訊
    startGameUseCase.execute()
  } else if (gameMode === 'mock' && mockEventEmitter) {
    // Mock 模式：啟動事件腳本
    mockEventEmitter.start()
  }
})

onUnmounted(() => {
  // 斷開連線（Backend 模式）
  if (gameConnection) {
    gameConnection.disconnect()
  }

  // 重置 Mock 事件發射器（Mock 模式）
  if (mockEventEmitter) {
    mockEventEmitter.reset()
  }
})


// GamePage 只作為協調者，不處理業務邏輯
// 所有場牌點擊邏輯已移至 FieldZone 組件內部處理
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
        @menu-click="toggleActionPanel"
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

    <!-- T043 [US3]: Unified Player Menu -->
    <UnifiedPlayerMenu
      :is-open="isActionPanelOpen"
      :player="playerInfo"
      :items="menuItems"
      @close="closeActionPanel"
      @logout="handleLogout"
      @delete-account="handleOpenDeleteAccountModal"
    />

    <!-- Delete Account Modal -->
    <DeleteAccountModal
      :is-open="isDeleteAccountModalOpen"
      :is-guest="isGuest"
      :is-loading="isDeleteAccountLoading"
      :error-message="deleteAccountError"
      @confirm="handleDeleteAccountConfirm"
      @cancel="handleDeleteAccountCancel"
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
