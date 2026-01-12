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

import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useMatchmakingStateStore } from '~/game-client/adapter/stores/matchmakingState'
import { resolveDependency } from '~/game-client/adapter/di/resolver'
import { TOKENS } from '~/game-client/adapter/di/tokens'
import type { SessionContextPort } from '~/game-client/application/ports/output'
import { RoomApiClient, type RoomType } from '~/game-client/adapter/api/RoomApiClient'
import { MatchmakingApiClient, MatchmakingError } from '~/game-client/adapter/api/MatchmakingApiClient'
import type { RoomTypeId } from '~~/shared/constants/roomTypes'
import DeleteAccountModal from '~/components/DeleteAccountModal.vue'
import LobbyTopInfoBar from './components/LobbyTopInfoBar.vue'
import type { MenuItem } from './components/LobbyTopInfoBar.vue'
import PlayerInfoCard from '~/components/PlayerInfoCard.vue'
import RegisterPrompt from '~/identity/adapter/components/RegisterPrompt.vue'
import MatchmakingErrorModal from './components/MatchmakingErrorModal.vue'
import { useCurrentPlayer } from '~/identity/adapter/composables/use-current-player'
import { useAuth } from '~/identity/adapter/composables/use-auth'
import { useAuthStore } from '~/identity/adapter/stores/auth-store'
import { useUIStateStore } from '~/game-client/adapter/stores/uiState'

// Pinia Store
const matchmakingStore = useMatchmakingStateStore()
const authStore = useAuthStore()

// Identity BC - 使用後端提供的 playerId
const { playerId, displayName, isGuest } = useCurrentPlayer()
const { logout, deleteAccount } = useAuth()

// DI 注入
const sessionContext = resolveDependency<SessionContextPort>(TOKENS.SessionContextPort)
const roomApiClient = resolveDependency<RoomApiClient>(TOKENS.RoomApiClient)
const matchmakingApiClient = resolveDependency<MatchmakingApiClient>(TOKENS.MatchmakingApiClient)

// 配對中狀態
const isMatchmaking = ref(false)

// ALREADY_IN_QUEUE 時，儲存正在配對的房間類型（用於顯示和取消後重試）
const pendingRoomTypeId = ref<string | null>(null)
const conflictingEntryId = ref<string | null>(null)

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
  pendingRoomTypeId.value = null
  conflictingEntryId.value = null
}

/**
 * 導航到遊戲頁面（配對中）
 */
function navigateToGameWithEntry(entryId: string): void {
  sessionContext.setEntryId(entryId)
  navigateTo('/game')
}

/**
 * 導航到遊戲頁面（遊戲中）
 */
function navigateToGameWithGameId(gameId: string): void {
  sessionContext.setCurrentGameId(gameId)
  navigateTo('/game')
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
  isMatchmaking.value = false
  pendingRoomTypeId.value = null
  conflictingEntryId.value = null

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

// 選擇房間並開始配對
const handleSelectRoom = async (roomTypeId: string) => {
  // 防止重複呼叫（API 呼叫中）
  if (isMatchmaking.value) return

  // 點擊時自動清除錯誤狀態（允許用戶重試）
  if (hasError.value) {
    clearLocalMatchmakingState()
  }

  // 使用 Identity BC 提供的 playerId (由後端 Session 管理)
  const currentPlayerId = playerId.value

  if (!currentPlayerId) {
    console.error('No player ID available - auth middleware should have initialized this')
    return
  }

  // 開始線上配對流程
  isMatchmaking.value = true
  matchmakingStore.setStatus('finding')

  try {
    const entryId = await matchmakingApiClient.enterMatchmaking(roomTypeId as RoomTypeId)
    navigateToGameWithEntry(entryId)
  } catch (error: unknown) {
    isMatchmaking.value = false

    if (error instanceof MatchmakingError) {
      const errorCode = error.errorCode

      // ALREADY_IN_QUEUE: 比較房間類型，決定是否直接導向或顯示選項
      if (errorCode === 'ALREADY_IN_QUEUE') {
        try {
          const status = await matchmakingApiClient.getPlayerStatus()
          if (status.status === 'MATCHMAKING') {
            if (status.roomType === roomTypeId) {
              // 相同房間：直接導向遊戲頁面
              navigateToGameWithEntry(status.entryId)
            } else {
              // 不同房間：顯示訊息讓用戶選擇
              pendingRoomTypeId.value = roomTypeId
              conflictingEntryId.value = status.entryId
              matchmakingStore.setStatus('error')
              matchmakingStore.setError('ALREADY_IN_QUEUE', `You are already queuing for "${status.roomType}"`)
            }
          } else if (status.status === 'IN_GAME') {
            navigateToGameWithGameId(status.gameId)
          }
        } catch {
          setMatchmakingError(null, 'Unable to retrieve matchmaking status')
        }
        return
      }

      // UNAUTHORIZED: 根據用戶類型處理
      if (errorCode === 'UNAUTHORIZED') {
        if (isGuest.value) {
          await handleGuestSessionRecovery(roomTypeId)
          return
        } else {
          matchmakingStore.setStatus('error')
          matchmakingStore.setError('SESSION_EXPIRED', '您的登入已過期，請重新登入')
          return
        }
      }

      // 其他錯誤（含 ALREADY_IN_GAME）：顯示 server 訊息
      setMatchmakingError(error, 'Failed to enter matchmaking')
    } else {
      setMatchmakingError(error, 'Failed to enter matchmaking')
    }
  }
}

/**
 * 訪客 Session 恢復
 *
 * 當訪客遇到 UNAUTHORIZED 錯誤時，自動重建 Session 並重試配對
 */
async function handleGuestSessionRecovery(roomTypeId: string): Promise<void> {
  try {
    await authStore.reinitAuth()
    const entryId = await matchmakingApiClient.enterMatchmaking(roomTypeId as RoomTypeId)
    navigateToGameWithEntry(entryId)
  } catch {
    matchmakingStore.setStatus('error')
    matchmakingStore.setError('RECOVERY_FAILED', '無法恢復連線，請重新整理頁面')
    isMatchmaking.value = false
  }
}

// 重試配對
const handleRetry = () => {
  isMatchmaking.value = false
  clearLocalMatchmakingState()
}

/**
 * 繼續當前配對
 *
 * @description
 * 當用戶選擇不同房間但已在配對中時，選擇繼續當前配對。
 * 需要先檢查玩家狀態，因為配對可能在這段時間內已經成功。
 */
const handleContinueQueue = async () => {
  try {
    const status = await matchmakingApiClient.getPlayerStatus()

    if (status.status === 'MATCHMAKING') {
      navigateToGameWithEntry(status.entryId)
    } else if (status.status === 'IN_GAME') {
      // 配對已成功，嘗試進入配對來觸發 server 返回 ALREADY_IN_GAME 錯誤
      pendingRoomTypeId.value = null
      conflictingEntryId.value = null
      await matchmakingApiClient.enterMatchmaking(status.roomTypeId)
    } else {
      // IDLE - 配對被取消或超時
      clearLocalMatchmakingState()
    }
  } catch (error: unknown) {
    setMatchmakingError(error, 'Unable to retrieve matchmaking status')
  }
}

/**
 * 取消當前配對並切換到新房間
 *
 * @description
 * 當用戶選擇不同房間但已在配對中時，取消當前配對並重新配對新房間。
 * 不預先檢查狀態，讓 server 返回錯誤（如 ALREADY_IN_GAME）。
 */
const handleCancelAndSwitch = async () => {
  if (!pendingRoomTypeId.value) return

  try {
    // 嘗試取消當前配對（如果有）
    if (conflictingEntryId.value) {
      try {
        await matchmakingApiClient.cancelMatchmaking(conflictingEntryId.value)
      } catch {
        // 取消失敗（可能配對已成功或被取消），繼續嘗試配對新房間
      }
    }

    // 清除狀態並取得新房間 ID
    matchmakingStore.clearSession()
    conflictingEntryId.value = null
    const newRoomTypeId = pendingRoomTypeId.value
    pendingRoomTypeId.value = null

    // 重新配對新房間（如果已在遊戲中，server 會返回 ALREADY_IN_GAME 錯誤）
    const entryId = await matchmakingApiClient.enterMatchmaking(newRoomTypeId as RoomTypeId)
    navigateToGameWithEntry(entryId)
  } catch (error: unknown) {
    setMatchmakingError(error, 'Failed to switch room. Please try again.')
  }
}

/**
 * 返回遊戲
 *
 * @description
 * 當玩家已在遊戲中時，直接導向遊戲頁面。
 * roomTypeId 由 SSE GameSnapshotRestore 事件提供。
 */
const handleBackToGame = async () => {
  try {
    const status = await matchmakingApiClient.getPlayerStatus()

    if (status.status === 'IN_GAME') {
      navigateToGameWithGameId(status.gameId)
    } else {
      // 玩家已不在遊戲中，清除錯誤狀態
      clearLocalMatchmakingState()
    }
  } catch (error: unknown) {
    setMatchmakingError(error, 'Unable to retrieve game status')
  }
}
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

    <!-- 配對錯誤 Modal -->
    <MatchmakingErrorModal
      :visible="hasError"
      :error-code="matchmakingStore.errorCode"
      :error-message="matchmakingStore.errorMessage"
      @dismiss="handleRetry"
      @retry="handleRetry"
      @back-to-game="handleBackToGame"
      @back-to-home="navigateTo('/')"
      @continue-queue="handleContinueQueue"
      @cancel-and-switch="handleCancelAndSwitch"
    />

  </div>
</template>

<style scoped>
/* 此頁面不再需要自訂樣式 */
</style>
