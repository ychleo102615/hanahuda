<!--
  GameLobby.vue - 遊戲大廳頁面

  @description
  使用者在此選擇房間類型並開始配對。
  點擊房間卡片後直接導航到遊戲頁面。
  WebSocket 連線在遊戲頁面建立，由後端透過 GatewayConnected 事件決定玩家狀態。

  功能:
  - 顯示房間類型列表（QUICK/STANDARD/MARATHON）
  - 點擊房間卡片開始配對
  - 配對錯誤重試按鈕
  - 進行中遊戲提示（選擇不同房間時提示用戶回到遊戲）

  Gateway 架構:
  - Lobby: 選擇房間 → 儲存 roomTypeId → 導航到 /game
  - Game Page: 建立 WebSocket → GatewayConnected 事件返回玩家狀態（IDLE/MATCHMAKING/IN_GAME）
-->

<script setup lang="ts">
// Nuxt 4: 定義頁面 middleware
definePageMeta({
  middleware: 'lobby',
})

import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useMatchmakingStateStore } from '~/game-client/adapter/stores/matchmakingState'
import { resolveDependency } from '~/game-client/adapter/di/resolver'
import { TOKENS } from '~/game-client/adapter/di/tokens'
import type { SessionContextPort } from '~/game-client/application/ports/output'
import { RoomApiClient, type RoomType } from '~/game-client/adapter/api/RoomApiClient'
import { MatchmakingApiClient, MatchmakingError } from '~/game-client/adapter/api/MatchmakingApiClient'
import type { RoomTypeId } from '~~/shared/constants/roomTypes'
import DeleteAccountModal from '~/components/DeleteAccountModal.vue'
import ConfirmDialog from '~/components/ConfirmDialog.vue'
import LobbyTopInfoBar from './components/LobbyTopInfoBar.vue'
import type { MenuItem } from './components/LobbyTopInfoBar.vue'
import PlayerInfoCard from '~/components/PlayerInfoCard.vue'
import RegisterPrompt from '~/identity/adapter/components/RegisterPrompt.vue'
import MatchmakingErrorModal from './components/MatchmakingErrorModal.vue'
import { useCurrentPlayer } from '~/identity/adapter/composables/use-current-player'
import { useAuth } from '~/identity/adapter/composables/use-auth'
import { useUIStateStore } from '~/game-client/adapter/stores/uiState'

// Pinia Store
const matchmakingStore = useMatchmakingStateStore()

// Identity BC - 使用後端提供的玩家資訊
const { displayName, isGuest } = useCurrentPlayer()
const { logout, deleteAccount } = useAuth()

// DI 注入
const sessionContext = resolveDependency<SessionContextPort>(TOKENS.SessionContextPort)
const roomApiClient = resolveDependency<RoomApiClient>(TOKENS.RoomApiClient)
const matchmakingApiClient = resolveDependency<MatchmakingApiClient>(TOKENS.MatchmakingApiClient)

// 檢查玩家狀態中（防止重複點擊）
const isCheckingStatus = ref(false)

// 狀態衝突對話框
const isStatusConflictDialogOpen = ref(false)
const pendingStatusInfo = ref<{
  type: 'matchmaking' | 'in_game'
  roomType?: string
  roomTypeId?: string
} | null>(null)

// Player Info Card 狀態
const isPlayerInfoCardOpen = ref(false)
const lobbyTopInfoBarRef = ref<InstanceType<typeof LobbyTopInfoBar> | null>(null)

// Delete Account Modal 狀態
const isDeleteAccountModalOpen = ref(false)
const isDeleteAccountLoading = ref(false)
const deleteAccountError = ref('')

// 房間類型狀態
const roomTypes = ref<RoomType[]>([])
const isLoadingRooms = ref(true)
const loadError = ref<string | null>(null)

// Computed properties
const hasError = computed(() => matchmakingStore.status === 'error')

// === 共用函數 ===

/**
 * 設定配對錯誤狀態
 */
function setMatchmakingError(error: unknown, fallbackMessage: string): void {
  matchmakingStore.setStatus('error')
  if (error instanceof MatchmakingError) {
    matchmakingStore.setError(error.errorCode, error.message)
  } else {
    matchmakingStore.setError('NETWORK_ERROR', fallbackMessage)
  }
}

/**
 * 清除本地配對狀態
 */
function clearLocalMatchmakingState(): void {
  matchmakingStore.clearSession()
  pendingStatusInfo.value = null
  isStatusConflictDialogOpen.value = false
}

// 選單項目
const menuItems = computed<MenuItem[]>(() => [
  {
    id: 'back-home',
    label: 'Back to Home',
    icon: 'home',
    onClick: handleBackToHome,
  },
])

// 載入房間類型
onMounted(async () => {
  // 重設本地狀態（確保從其他頁面返回時按鈕可點擊）
  isCheckingStatus.value = false
  pendingStatusInfo.value = null
  isStatusConflictDialogOpen.value = false

  // 載入房間類型
  try {
    roomTypes.value = await roomApiClient.getRoomTypes()
  } catch (_error) {
    loadError.value = 'Failed to load room types'
  } finally {
    isLoadingRooms.value = false
  }
})

// 離開頁面時清理錯誤狀態
onBeforeUnmount(() => {
  if (matchmakingStore.status === 'error') {
    matchmakingStore.clearSession()
  }
})

// 玩家資訊小卡控制
const handlePlayerClick = () => {
  isPlayerInfoCardOpen.value = !isPlayerInfoCardOpen.value
}

const handlePlayerInfoCardClose = () => {
  isPlayerInfoCardOpen.value = false
}

// 返回首頁
const handleBackToHome = () => {
  navigateTo('/')
}

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

/**
 * 選擇房間
 *
 * @description
 * 先呼叫 getPlayerStatus API 檢查玩家狀態，再決定下一步動作。
 *
 * 流程：
 * - IDLE：儲存 selectedRoomTypeId 並導航到 /game 開始配對
 * - MATCHMAKING + 相同房間：直接導航到 /game 繼續配對
 * - MATCHMAKING + 不同房間：顯示狀態衝突對話框
 * - IN_GAME + 相同房間：直接導航到 /game 回到遊戲
 * - IN_GAME + 不同房間：顯示狀態衝突對話框
 *
 * 玩家無法放棄配對/遊戲，只能選擇回去或留在 lobby。
 */
const handleSelectRoom = async (roomTypeId: string) => {
  // 防止重複點擊
  if (isCheckingStatus.value) return

  // 點擊時自動清除錯誤狀態（允許用戶重試）
  if (hasError.value) {
    clearLocalMatchmakingState()
  }

  isCheckingStatus.value = true

  try {
    // 呼叫 API 檢查玩家狀態
    const status = await matchmakingApiClient.getPlayerStatus()

    if (status.status === 'IDLE') {
      // 閒置：正常開始配對
      sessionContext.setSelectedRoomTypeId(roomTypeId as RoomTypeId)
      navigateTo('/game')
      return
    }

    if (status.status === 'MATCHMAKING') {
      // 設置 session 資料讓 middleware 通過
      sessionContext.setSelectedRoomTypeId(status.roomType)

      if (status.roomType === roomTypeId) {
        // 相同房間：繼續配對
        navigateTo('/game')
      } else {
        // 不同房間：顯示提示
        pendingStatusInfo.value = { type: 'matchmaking', roomType: status.roomType }
        isStatusConflictDialogOpen.value = true
      }
      return
    }

    if (status.status === 'IN_GAME') {
      // 設置 session 資料讓 middleware 通過
      sessionContext.setCurrentGameId(status.gameId)

      if (status.roomTypeId === roomTypeId) {
        // 相同房間：回到遊戲
        navigateTo('/game')
      } else {
        // 不同房間：顯示提示
        pendingStatusInfo.value = { type: 'in_game', roomTypeId: status.roomTypeId }
        isStatusConflictDialogOpen.value = true
      }
      return
    }
  } catch (error) {
    // API 失敗：顯示錯誤
    setMatchmakingError(error, 'Unable to check player status')
  } finally {
    isCheckingStatus.value = false
  }
}

/**
 * 回到配對/遊戲
 *
 * @description
 * 用戶選擇回到進行中的配對或遊戲。
 */
const handleReturnToActivity = () => {
  isStatusConflictDialogOpen.value = false
  pendingStatusInfo.value = null
  navigateTo('/game')
}

/**
 * 留在 Lobby
 *
 * @description
 * 用戶取消選擇，關閉對話框並留在 lobby。
 */
const handleStayInLobby = () => {
  isStatusConflictDialogOpen.value = false
  pendingStatusInfo.value = null
}

// 重試配對
const handleRetry = () => {
  clearLocalMatchmakingState()
}

// 狀態衝突對話框的 computed properties
const conflictDialogTitle = computed(() => {
  if (!pendingStatusInfo.value) return ''
  return pendingStatusInfo.value.type === 'matchmaking'
    ? 'Matchmaking in Progress'
    : 'Game in Progress'
})

const conflictDialogMessage = computed(() => {
  if (!pendingStatusInfo.value) return ''
  return pendingStatusInfo.value.type === 'matchmaking'
    ? 'You are currently in matchmaking queue. Would you like to continue waiting?'
    : 'You have a game in progress. Would you like to return to it?'
})

const conflictDialogConfirmText = computed(() => {
  if (!pendingStatusInfo.value) return ''
  return pendingStatusInfo.value.type === 'matchmaking'
    ? 'Continue Matchmaking'
    : 'Return to Game'
})

</script>

<template>
  <div class="min-h-screen lobby-bg flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
    <!-- 頂部資訊列 -->
    <header class="h-14 shrink-0">
      <LobbyTopInfoBar
        ref="lobbyTopInfoBarRef"
        :menu-items="menuItems"
        @player-click="handlePlayerClick"
        @logout="handleLogout"
        @delete-account="handleOpenDeleteAccountModal"
      />
    </header>

    <!-- 主要內容區 -->
    <main class="flex-1 flex items-center justify-center p-4 relative z-0">
      <div class="max-w-4xl w-full">
        <!-- 卡片清單容器 - 金箔蒔絵風格 -->
        <div class="lobby-card rounded-xl p-6 md:p-8">
          <!-- 標題 - 金色字體 -->
          <h1 class="text-2xl md:text-3xl font-bold text-center mb-8">
            <span class="bg-gradient-to-r from-gold-pale via-gold-light to-gold bg-clip-text text-transparent">
              Select Game Mode
            </span>
          </h1>

          <!-- 載入中 -->
          <div v-if="isLoadingRooms" class="flex justify-center py-12">
            <div class="animate-spin rounded-full h-12 w-12 border-2 border-gold-dark border-t-gold-light" />
          </div>

          <!-- 載入錯誤 -->
          <div v-else-if="loadError" class="text-center py-12">
            <p class="text-red-400 mb-4">{{ loadError }}</p>
            <button
              class="bg-gold-dark hover:bg-gold text-white font-semibold py-2 px-6 rounded-lg transition-colors"
              @click="$router.go(0)"
            >
              Retry
            </button>
          </div>

          <!-- 房間類型列表 -->
          <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <button
              v-for="room in roomTypes"
              :key="room.id"
              :disabled="isLoadingRooms"
              class="group lobby-card rounded-lg p-6 text-left disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none"
              @click="handleSelectRoom(room.id)"
            >
              <!-- 房間名稱 - 金色漸層 -->
              <h2 class="text-xl font-bold mb-2 bg-gradient-to-r from-gold-light to-gold-pale bg-clip-text text-transparent group-hover:from-gold-bright group-hover:to-gold-light transition-all">
                {{ room.name }}
              </h2>

              <!-- 房間描述 -->
              <p class="text-gray-400 text-sm mb-4 leading-relaxed">
                {{ room.description }}
              </p>

              <!-- 房間規格 - 金色分隔線 -->
              <div class="text-xs text-gold-dark pt-4 border-t border-gold-dark/30">
                <span>{{ room.rounds }} rounds</span>
              </div>
            </button>
          </div>

        </div>
      </div>
    </main>

    <!-- Player Info Card (純資訊展示) -->
    <PlayerInfoCard
      :is-open="isPlayerInfoCardOpen"
      :display-name="displayName"
      :is-guest="isGuest"
      :anchor-ref="lobbyTopInfoBarRef?.playerBadgeRef"
      @close="handlePlayerInfoCardClose"
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

    <!-- 訪客註冊提示 -->
    <RegisterPrompt />

    <!-- 配對錯誤 Modal（只處理 getPlayerStatus API 的網路錯誤） -->
    <MatchmakingErrorModal
      :visible="hasError"
      :error-code="matchmakingStore.errorCode"
      :error-message="matchmakingStore.errorMessage"
      @dismiss="handleRetry"
      @retry="handleRetry"
    />

    <!-- 狀態衝突對話框（用戶選擇不同房間時顯示） -->
    <ConfirmDialog
      :is-open="isStatusConflictDialogOpen"
      :title="conflictDialogTitle"
      :message="conflictDialogMessage"
      :confirm-text="conflictDialogConfirmText"
      cancel-text="Stay Here"
      @confirm="handleReturnToActivity"
      @cancel="handleStayInLobby"
    />

    <!-- Loading Overlay -->
    <Transition name="fade">
      <div
        v-if="isCheckingStatus"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      >
        <div class="flex flex-col items-center gap-4">
          <div class="animate-spin rounded-full h-10 w-10 border-2 border-gold-dark border-t-gold-light" />
          <span class="text-gold-light text-sm">Checking status...</span>
        </div>
      </div>
    </Transition>

  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
