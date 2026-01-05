<!--
  GameLobby.vue - 遊戲大廳頁面

  @description
  使用者在此選擇房間類型並開始配對。
  點擊房間卡片後直接導航到遊戲頁面。
  SSE 連線在遊戲頁面建立，由後端透過 InitialState 事件決定遊戲狀態。

  功能:
  - 顯示房間類型列表（QUICK/STANDARD/MARATHON）
  - 點擊房間卡片開始配對
  - 配對錯誤重試按鈕

  SSE-First 架構:
  - Lobby: 選擇房間 → 儲存 playerId + roomTypeId → 導航到 /game
  - Game Page: 建立 SSE → InitialState 事件決定顯示
-->

<script setup lang="ts">
// Nuxt 4: 定義頁面 middleware
definePageMeta({
  middleware: 'lobby',
})

import { ref, computed, onMounted } from 'vue'
import { useMatchmakingStateStore } from '~/user-interface/adapter/stores/matchmakingState'
import { useDependency } from '~/user-interface/adapter/composables/useDependency'
import { TOKENS } from '~/user-interface/adapter/di/tokens'
import type { SessionContextPort } from '~/user-interface/application/ports/output'
import { RoomApiClient, type RoomType } from '~/user-interface/adapter/api/RoomApiClient'
import UnifiedPlayerMenu from '~/components/UnifiedPlayerMenu.vue'
import DeleteAccountModal from '~/components/DeleteAccountModal.vue'
import LobbyTopInfoBar from '~/components/LobbyTopInfoBar.vue'
import PlayerInfoCard from '~/components/PlayerInfoCard.vue'
import type { ActionPanelItem } from '~/components/ActionPanel.vue'
import RegisterPrompt from '~/identity/adapter/components/RegisterPrompt.vue'
import { useCurrentPlayer } from '~/identity/adapter/composables/use-current-player'
import { useAuth } from '~/identity/adapter/composables/use-auth'
import { useUIStateStore } from '~/user-interface/adapter/stores/uiState'

// Pinia Store
const matchmakingStore = useMatchmakingStateStore()

// Identity BC - 使用後端提供的 playerId
const { playerId, displayName, isGuest } = useCurrentPlayer()
const { logout, deleteAccount } = useAuth()

// DI 注入
const sessionContext = useDependency<SessionContextPort>(TOKENS.SessionContextPort)
const roomApiClient = useDependency<RoomApiClient>(TOKENS.RoomApiClient)

// Player Menu 狀態
const isPanelOpen = ref(false)

// Player Info Card 狀態
const isPlayerInfoCardOpen = ref(false)
const lobbyTopInfoBarRef = ref<InstanceType<typeof LobbyTopInfoBar> | null>(null)

// 玩家資訊（傳給 UnifiedPlayerMenu）
const playerInfo = computed(() => ({
  displayName: displayName.value,
  isGuest: isGuest.value,
}))

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
const canStartMatchmaking = computed(() => matchmakingStore.canStartMatchmaking)

// Action Panel 選單項目
const menuItems = computed<ActionPanelItem[]>(() => [
  {
    id: 'back-home',
    label: 'Back to Home',
    icon: 'home',
    onClick: handleBackToHome,
  },
])

// 載入房間類型
onMounted(async () => {
  try {
    roomTypes.value = await roomApiClient.getRoomTypes()
  } catch (_error) {
    loadError.value = 'Failed to load room types'
  } finally {
    isLoadingRooms.value = false
  }
})

// 開啟/關閉 Action Panel
const togglePanel = () => {
  isPanelOpen.value = !isPanelOpen.value
}

const closePanel = () => {
  isPanelOpen.value = false
}

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
  closePanel()
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

// 選擇房間並開始配對
const handleSelectRoom = (roomTypeId: string) => {
  if (!canStartMatchmaking.value) return

  // 使用 Identity BC 提供的 playerId (由後端 Session 管理)
  const currentPlayerId = playerId.value
  const playerName = displayName.value || 'Player'

  if (!currentPlayerId) {
    console.error('No player ID available - auth middleware should have initialized this')
    return
  }

  // 儲存到 SessionContext（供 game page 使用）
  sessionContext.setIdentity({ playerId: currentPlayerId, playerName, roomTypeId })

  // 直接導航到遊戲頁面，SSE 連線在那裡建立
  navigateTo('/game')
}

// 重試配對
const handleRetry = () => {
  matchmakingStore.clearSession()
  // 狀態已重置為 idle，使用者可以再次選擇房間
}
</script>

<template>
  <div class="min-h-screen bg-green-900 flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
    <!-- 頂部資訊列 -->
    <header class="h-14 shrink-0">
      <LobbyTopInfoBar
        ref="lobbyTopInfoBarRef"
        @menu-click="togglePanel"
        @player-click="handlePlayerClick"
      />
    </header>

    <!-- 主要內容區 -->
    <main class="flex-1 flex items-center justify-center p-4">
      <div class="max-w-4xl w-full">
        <!-- 卡片清單容器 -->
        <div class="border-2 border-gray-700/50 rounded-xl p-6 bg-gray-900/20">
          <!-- 標題 -->
          <h1 class="text-2xl font-bold text-white mb-6 text-center">
            Select Game Mode
          </h1>

          <!-- 載入中 -->
          <div v-if="isLoadingRooms" class="flex justify-center py-12">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
          </div>

          <!-- 載入錯誤 -->
          <div v-else-if="loadError" class="text-center py-12">
            <p class="text-red-400 mb-4">{{ loadError }}</p>
            <button
              class="bg-primary-600 hover:bg-primary-500 text-white font-semibold py-2 px-4 rounded-lg"
              @click="$router.go(0)"
            >
              Retry
            </button>
          </div>

          <!-- 房間類型列表 -->
          <div v-else class="grid gap-6 px-6">
            <button
              v-for="room in roomTypes"
              :key="room.id"
              :disabled="!canStartMatchmaking || hasError"
              class="bg-gray-800/80 backdrop-blur-sm rounded-lg shadow-xl p-6 border border-gray-700 text-left transition-all duration-200 hover:scale-[1.02] hover:-translate-y-1 hover:shadow-2xl hover:border-primary-500 hover:bg-gray-800/90 active:scale-[0.98] active:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:translate-y-0 disabled:hover:shadow-xl disabled:hover:border-gray-700"
              @click="handleSelectRoom(room.id)"
            >
              <!-- 房間名稱 -->
              <h2 class="text-xl font-bold text-white mb-2">
                {{ room.name }}
              </h2>

              <!-- 房間描述 -->
              <p class="text-gray-400 text-sm mb-4">
                {{ room.description }}
              </p>

              <!-- 房間規格 -->
              <div class="text-xs text-gray-500 pt-4 border-t border-gray-600/50">
                <span>{{ room.rounds }} rounds</span>
              </div>
            </button>
          </div>

          <!-- 錯誤訊息 -->
          <div
            v-if="hasError"
            data-testid="error-message"
            role="alert"
            class="mt-6 bg-red-900/30 border border-red-700 rounded-lg p-4"
          >
            <div class="flex items-start">
              <svg
                class="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clip-rule="evenodd"
                />
              </svg>
              <div class="flex-1">
                <h3 class="text-sm font-medium text-red-300">Matchmaking Failed</h3>
                <p class="mt-1 text-sm text-red-400">
                  {{ matchmakingStore.errorMessage || 'An error occurred. Please try again.' }}
                </p>
              </div>
            </div>

            <!-- 重試按鈕 -->
            <button
              data-testid="retry-button"
              class="mt-4 w-full bg-primary-600 hover:bg-primary-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
              @click="handleRetry"
            >
              Retry
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

    <!-- Unified Player Menu -->
    <UnifiedPlayerMenu
      :is-open="isPanelOpen"
      :player="playerInfo"
      :items="menuItems"
      @close="closePanel"
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

    <!-- 訪客註冊提示 -->
    <RegisterPrompt />
  </div>
</template>

<style scoped>
/* 此頁面不再需要自訂樣式 */
</style>
