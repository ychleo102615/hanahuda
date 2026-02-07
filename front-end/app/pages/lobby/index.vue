<!--
  GameLobby.vue - 遊戲大廳頁面

  @description
  使用者在此選擇房間類型並開始配對。
  點擊房間卡片後直接導航到遊戲頁面。
  SSE 連線在遊戲頁面建立，由後端透過 GatewayConnected 事件決定玩家狀態。

  功能:
  - 顯示房間類型列表（QUICK/STANDARD/MARATHON）
  - 點擊房間卡片開始配對
  - 配對錯誤重試按鈕
  - 進行中遊戲提示（選擇不同房間時提示用戶回到遊戲）

  Gateway 架構:
  - Lobby: 選擇房間 → 儲存 roomTypeId → 導航到 /game
  - Game Page: 建立 SSE 連線 → GatewayConnected 事件返回玩家狀態（IDLE/MATCHMAKING/IN_GAME）
-->

<script setup lang="ts">
// Nuxt 4: 定義頁面 middleware
definePageMeta({
  middleware: 'lobby',
})

import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useMatchmakingStateStore } from '~/game-client/adapter/stores/matchmakingState'
import { usePrivateRoomStateStore } from '~/game-client/adapter/stores/privateRoomState'
import { resolveDependency } from '~/game-client/adapter/di/resolver'
import { TOKENS } from '~/game-client/adapter/di/tokens'
import type { SessionContextPort } from '~/game-client/application/ports/output'
import { RoomApiClient, type RoomType } from '~/game-client/adapter/api/RoomApiClient'
import { MatchmakingApiClient, MatchmakingError, type PlayerStatus } from '~/game-client/adapter/api/MatchmakingApiClient'
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
const privateRoomStore = usePrivateRoomStateStore()

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

// Tab 狀態
const activeTab = ref<'public' | 'private'>('public')

// 玩家狀態（用於活躍狀態提示橫幅）
const initialPlayerStatus = ref<PlayerStatus | null>(null)

// Private Room 狀態
const isCreatingRoom = ref(false)
const joinRoomId = ref('')
const isJoiningRoom = ref(false)

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

// 載入房間類型 + 玩家狀態
onMounted(async () => {
  // 重設本地狀態（確保從其他頁面返回時按鈕可點擊）
  isCheckingStatus.value = false
  pendingStatusInfo.value = null
  isStatusConflictDialogOpen.value = false

  // 平行載入：房間類型 + 玩家狀態
  const [roomResult] = await Promise.allSettled([
    roomApiClient.getRoomTypes(),
    matchmakingApiClient.getPlayerStatus()
      .then((status) => { initialPlayerStatus.value = status })
      .catch(() => {}), // 靜默失敗：banner 不顯示即可
  ])

  if (roomResult.status === 'fulfilled') {
    roomTypes.value = roomResult.value
  } else {
    loadError.value = 'Failed to load room types'
  }
  isLoadingRooms.value = false
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

    if (status.status === 'IN_PRIVATE_ROOM') {
      const uiStore = useUIStateStore()
      uiStore.addToast({
        type: 'warning',
        message: 'You have an active private room. Dissolve it first.',
        duration: 4000,
        dismissible: true,
      })
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

/**
 * 返回活躍的配對/遊戲/私人房間
 */
function handleReturnToActiveSession(): void {
  const status = initialPlayerStatus.value
  if (!status || status.status === 'IDLE') return

  if (status.status === 'MATCHMAKING') {
    sessionContext.setSelectedRoomTypeId(status.roomType)
  } else if (status.status === 'IN_GAME') {
    sessionContext.setCurrentGameId(status.gameId)
  } else if (status.status === 'IN_PRIVATE_ROOM') {
    sessionContext.setSelectedRoomTypeId(status.roomType)
  }
  navigateTo('/game')
}

// 重試配對
const handleRetry = () => {
  clearLocalMatchmakingState()
}

// === Private Room ===

const handleCreateRoom = async (roomTypeId: string) => {
  isCreatingRoom.value = true
  const uiStore = useUIStateStore()

  try {
    const response = await $fetch<{
      success: boolean
      room_id: string
      share_url: string
      expires_at: string
      error?: { code: string; message: string }
    }>('/api/private-room/create', {
      method: 'POST',
      body: { room_type: roomTypeId },
    })

    if (response.success) {
      privateRoomStore.setRoomInfo({
        roomId: response.room_id,
        roomType: roomTypeId,
        hostName: displayName.value,
        roomStatus: 'WAITING',
      })
      // 導航到遊戲頁面，建立 SSE 連線等待訪客加入
      sessionContext.setSelectedRoomTypeId(roomTypeId as RoomTypeId)
      navigateTo('/game')
    }
  } catch (error: unknown) {
    const errorData = error as { data?: { error?: { code?: string; message?: string } } }
    const message = errorData?.data?.error?.message ?? 'Failed to create private room'
    uiStore.addToast({
      type: 'error',
      message,
      duration: 4000,
      dismissible: true,
    })
  } finally {
    isCreatingRoom.value = false
  }
}

const handleJoinRoom = async () => {
  const roomId = joinRoomId.value.trim().toUpperCase()
  if (!roomId) return

  isJoiningRoom.value = true
  const uiStore = useUIStateStore()

  try {
    const response = await $fetch<{
      success: boolean
      room_id: string
      host_name: string
      room_type: string
      error?: { code: string; message: string }
    }>(`/api/private-room/${roomId}/join`, {
      method: 'POST',
    })

    if (response.success) {
      privateRoomStore.setRoomInfo({
        roomId: response.room_id,
        roomType: response.room_type,
        hostName: response.host_name,
        roomStatus: 'FULL',
      })
      // 設定 sessionContext 以通過 game middleware
      sessionContext.setSelectedRoomTypeId(response.room_type as RoomTypeId)
      // 導航到遊戲頁面，SSE 連線後觸發 StartPrivateRoomGame
      navigateTo('/game')
    }
  } catch (error: unknown) {
    const errorData = error as { data?: { error?: { code?: string; message?: string } } }
    const message = errorData?.data?.error?.message ?? 'Failed to join room'
    uiStore.addToast({
      type: 'error',
      message,
      duration: 4000,
      dismissible: true,
    })
  } finally {
    isJoiningRoom.value = false
    joinRoomId.value = ''
  }
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
    <main class="flex-1 flex items-start justify-center p-4 pt-8 relative z-0">
      <div class="max-w-4xl w-full space-y-6">

        <!-- 活躍狀態提示橫幅 -->
        <div
          v-if="initialPlayerStatus && initialPlayerStatus.status !== 'IDLE'"
          class="lobby-card rounded-xl p-4 flex items-center justify-between gap-4"
        >
          <p class="text-sm text-gray-300">
            <template v-if="initialPlayerStatus.status === 'MATCHMAKING'">
              You are currently in matchmaking queue.
            </template>
            <template v-else-if="initialPlayerStatus.status === 'IN_GAME'">
              You have a game in progress.
            </template>
            <template v-else-if="initialPlayerStatus.status === 'IN_PRIVATE_ROOM'">
              You have an active private room.
            </template>
          </p>
          <button
            class="shrink-0 px-4 py-1.5 text-sm font-medium rounded-lg bg-gradient-to-r from-gold to-gold-dark text-black hover:from-gold-light hover:to-gold transition-all"
            @click="handleReturnToActiveSession"
          >
            Return
          </button>
        </div>

        <!-- 標籤列（獨立 sibling） -->
        <div class="flex gap-1 p-1 rounded-lg tab-container justify-center">
          <button
            type="button"
            class="tab-button px-4 py-2 text-sm font-medium rounded-md cursor-pointer transition-all duration-200 ease-out"
            :class="activeTab === 'public' ? 'tab-button-active' : 'text-gray-400 hover:text-white hover:bg-gold-dark/20'"
            @click="activeTab = 'public'"
          >
            Public Match
          </button>
          <button
            type="button"
            class="tab-button px-4 py-2 text-sm font-medium rounded-md cursor-pointer transition-all duration-200 ease-out"
            :class="activeTab === 'private' ? 'tab-button-active' : 'text-gray-400 hover:text-white hover:bg-gold-dark/20'"
            @click="activeTab = 'private'"
          >
            Private Room
          </button>
        </div>

        <!-- 卡片清單容器 - 金箔蒔絵風格 -->
        <div class="lobby-card rounded-xl p-6 md:p-8">
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

          <!-- Quick Match 標籤 -->
          <div v-else-if="activeTab === 'public'" class="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <button
              v-for="room in roomTypes"
              :key="room.id"
              :disabled="isCheckingStatus"
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

          <!-- Private Room 標籤 -->
          <div v-else>
            <!-- 建立房間 — 與公開配對相同的卡片設計 -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <button
                v-for="room in roomTypes"
                :key="room.id"
                :disabled="isCreatingRoom"
                class="group lobby-card rounded-lg p-6 text-left disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none"
                @click="handleCreateRoom(room.id)"
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

            <!-- 加入房間 -->
            <div class="mt-6 pt-6 border-t border-gold-dark/30">
              <p class="text-center text-sm text-gray-400 mb-3">Or join an existing room</p>
              <div class="flex justify-center gap-2">
                <input
                  v-model="joinRoomId"
                  type="text"
                  placeholder="Room ID"
                  maxlength="6"
                  class="w-24 px-3 py-2 text-sm text-center font-mono uppercase bg-black/30 text-gray-300 rounded border border-gold-dark/30 focus:border-gold-light/50 focus:outline-none placeholder:text-gray-600"
                  @keyup.enter="handleJoinRoom"
                />
                <button
                  :disabled="isJoiningRoom || !joinRoomId.trim()"
                  class="px-4 py-2 text-sm text-gold-dark hover:text-gold-light border border-gold-dark/50 hover:border-gold-light/50 rounded-lg transition-colors disabled:opacity-50"
                  @click="handleJoinRoom"
                >
                  Join
                </button>
              </div>
            </div>
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
        v-if="isCheckingStatus || isCreatingRoom"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      >
        <div class="flex flex-col items-center gap-4">
          <div class="animate-spin rounded-full h-10 w-10 border-2 border-gold-dark border-t-gold-light" />
          <span class="text-gold-light text-sm">
            {{ isCreatingRoom ? 'Creating room...' : 'Checking status...' }}
          </span>
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

/* Tab Container */
.tab-container {
  background: rgba(26, 26, 26, 0.5);
  border: 1px solid rgba(139, 105, 20, 0.2);
}

/* Tab Buttons */
.tab-button-active {
  background: linear-gradient(180deg, #D4AF37 0%, #B8860B 100%);
  color: #1a1a1a;
  box-shadow: 0 2px 8px rgba(212, 175, 55, 0.3);
}
</style>
