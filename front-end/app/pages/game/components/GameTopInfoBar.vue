<!--
  GameTopInfoBar.vue - 遊戲頂部資訊列

  @description
  遊戲頁面專用的狀態面板，顯示對手/玩家資訊、回合狀態、倒數計時等。
  使用 ResponsiveMenu 組件處理選單邏輯。
  注意：遊戲進行中禁止帳號操作（登出/刪除），需透過 Leave Game 離開。

  響應式設計：
  - 大螢幕 (>=640px)：完整顯示（名稱、分數、Cards left、Koi-Koi 狀態）
  - 小螢幕 (<640px)：隱藏 Cards left，保留名稱、分數、Koi-Koi 狀態

  Props:
  - menuItems: MenuItem[] - 選單項目列表

  Events:
  - playerClick: 玩家圖示點擊事件（顯示資訊小卡）
-->

<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStateStore } from '~/game-client/adapter/stores/gameState'
import { useUIStateStore } from '~/game-client/adapter/stores/uiState'
import { useCurrentPlayer } from '~/identity/adapter/composables/use-current-player'
import { Z_INDEX } from '~/constants'
import ResponsiveMenu from '~/components/menu/ResponsiveMenu.vue'
import type { MenuItem } from '~/components/menu/types'

// Re-export MenuItem type for parent components
export type { MenuItem }

interface Props {
  menuItems?: MenuItem[]
}

const props = withDefaults(defineProps<Props>(), {
  menuItems: () => [],
})

const emit = defineEmits<{
  playerClick: []
}>()

// 取得玩家資訊（用於資訊小卡）
const { displayName, isGuest } = useCurrentPlayer()

// Ref for player avatar (for Popover positioning)
const playerAvatarRef = ref<HTMLElement | null>(null)

// 選單開關狀態
const isMenuOpen = ref(false)

// Expose ref for parent to access
defineExpose({
  playerAvatarRef,
  displayName,
  isGuest,
})

const gameState = useGameStateStore()
const uiState = useUIStateStore()

const {
  myScore,
  opponentScore,
  turnStatus,
  localPlayerName,
  opponentPlayerName,
  currentFlowStage,
  opponentHandCount,
  myKoiKoiMultiplier,
  opponentKoiKoiMultiplier,
  currentRound,
  ruleset,
  isPlayerDealer,
  isOpponentDealer,
} = storeToRefs(gameState)

const {
  countdownRemaining,
  countdownMode,
  waitingForOpponent,
  reconnecting,
  gameFinishedModalVisible,
  dealingInProgress,
} = storeToRefs(uiState)

// 只有 ACTION 模式時才顯示倒數（TopInfoBar 用於操作倒數）
const actionTimeoutRemaining = computed(() => {
  if (countdownRemaining.value !== null && countdownMode.value === 'ACTION') {
    return countdownRemaining.value
  }
  return null
})

// 統一狀態文字（單一行顯示）
const statusText = computed(() => {
  // Priority 1: 等待對手加入
  if (waitingForOpponent.value) return 'Waiting for opponent...'
  // Priority 2: 重連中
  if (reconnecting.value) return 'Reconnecting...'
  // Priority 3: 遊戲結束
  if (gameFinishedModalVisible.value) return 'Game Over'

  // Priority 4: 發牌中
  if (dealingInProgress.value) return 'Dealing...'

  // Priority 5: 回合結束（flowStage 被清除）
  if (!currentFlowStage.value) return 'Round Over'

  const isMyTurn = turnStatus.value === 'my-turn'

  switch (currentFlowStage.value) {
    case 'AWAITING_HAND_PLAY':
      return isMyTurn ? 'Your Turn - Play a card' : 'Opponent is playing...'
    case 'AWAITING_SELECTION':
      return isMyTurn ? 'Your Turn - Select a card' : 'Opponent is selecting...'
    case 'AWAITING_DECISION':
      return isMyTurn ? 'Your Turn - Make decision' : 'Opponent is deciding...'
    default:
      return ''
  }
})

// 狀態文字是否為自己回合（用於高亮樣式）
// 排除發牌中等中立狀態，避免「Dealing...」等訊息被黃色高亮
const isMyTurnStatus = computed(() => {
  return turnStatus.value === 'my-turn'
    && !waitingForOpponent.value
    && !reconnecting.value
    && !gameFinishedModalVisible.value
    && !dealingInProgress.value
})

// 倒數顯示樣式（低於 5 秒警示）
const countdownClass = computed(() => {
  if (actionTimeoutRemaining.value !== null && actionTimeoutRemaining.value <= 5) {
    return 'text-red-500'
  }
  return 'text-white'
})

// 總局數
const totalRounds = computed(() => ruleset.value?.total_rounds ?? 12)

// 切換選單
const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value
}

// 關閉選單
const closeMenu = () => {
  isMenuOpen.value = false
}
</script>

<template>
  <div class="h-full topbar-glass text-white relative" :style="{ zIndex: Z_INDEX.DROPDOWN }">
    <!-- Header Bar -->
    <div class="h-full px-4 py-2 flex items-center justify-between">
      <!-- Left Section: 對手資訊 -->
      <div class="flex items-center gap-2 sm:gap-4 shrink-0">
        <!-- 分數欄 -->
        <div class="text-center">
          <!-- 名稱 + 莊家標記（小螢幕簡寫，大螢幕完整） -->
          <div class="flex text-xs text-gray-400 items-center justify-center gap-1">
            <span class="sm:hidden">Opp.</span>
            <span class="hidden sm:inline">{{ opponentPlayerName || 'Opponent' }}</span>
            <span v-if="isOpponentDealer" class="text-amber-500 font-bold" title="Dealer">(親)</span>
          </div>
          <div class="text-xl font-bold">{{ opponentScore }}</div>
          <!-- Koi-Koi 狀態 -->
          <div class="flex h-4 items-center justify-center">
            <span
              v-if="opponentKoiKoiMultiplier > 1"
              class="text-xs text-amber-400"
            >
              koikoi
            </span>
          </div>
        </div>
        <!-- 手牌數欄：小螢幕隱藏 -->
        <div class="hidden sm:flex flex-col items-center gap-1 text-gray-300" title="Opponent hand count">
          <span class="text-sm text-gray-400 font-medium">Cards left</span>
          <span class="text-sm font-medium">{{ opponentHandCount }}</span>
        </div>
      </div>

      <!-- Center Section: 回合資訊 -->
      <div class="flex flex-col items-center shrink min-w-0">
        <!-- 局數顯示 -->
        <div v-if="currentRound !== null" class="text-sm text-gray-400 whitespace-nowrap">
          Round {{ currentRound }} / {{ totalRounds }}
        </div>
        <!-- Unified status text -->
        <div
          v-if="statusText"
          class="text-lg font-medium truncate max-w-full"
          :class="{ 'text-yellow-400': isMyTurnStatus }"
        >
          {{ statusText }}
        </div>
        <!-- Countdown Display (固定高度防止抖動) -->
        <div class="h-7 flex items-center justify-center">
          <span
            v-if="actionTimeoutRemaining !== null"
            class="text-xl font-bold"
            :class="countdownClass"
          >
            {{ actionTimeoutRemaining }}
          </span>
        </div>
      </div>

      <!-- Right Section: 玩家資訊 + 選單 -->
      <div class="flex items-center gap-2 sm:gap-4 shrink-0">
        <div class="text-center">
          <!-- 名稱 + 莊家標記（小螢幕簡寫，大螢幕完整） -->
          <div class="flex text-xs text-gray-400 items-center justify-center gap-1">
            <span class="sm:hidden">You</span>
            <span class="hidden sm:inline">{{ localPlayerName || 'You' }}</span>
            <span v-if="isPlayerDealer" class="text-amber-500 font-bold" title="Dealer">(親)</span>
          </div>
          <div class="text-xl font-bold">{{ myScore }}</div>
          <!-- Koi-Koi 狀態 -->
          <div class="flex h-4 items-center justify-center">
            <span
              v-if="myKoiKoiMultiplier > 1"
              class="text-xs text-amber-400"
            >
              koikoi
            </span>
          </div>
        </div>
        <!-- Clickable player avatar (for info card) -->
        <button
          ref="playerAvatarRef"
          class="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center hover:bg-gray-500 transition-colors"
          @click="emit('playerClick')"
          aria-label="View player info"
        >
          <svg class="w-4 h-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
          </svg>
        </button>
        <!-- Menu Button -->
        <button
          data-testid="menu-button"
          aria-label="Toggle menu"
          :aria-expanded="isMenuOpen"
          class="p-2 rounded-lg hover:bg-white/10 transition-colors"
          @click="toggleMenu"
        >
          <svg
            class="h-6 w-6 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              v-if="!isMenuOpen"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 6h16M4 12h16M4 18h16"
            />
            <path
              v-else
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>

    <!-- Responsive Menu (遊戲中禁止帳號操作) -->
    <ResponsiveMenu
      :is-open="isMenuOpen"
      :menu-items="props.menuItems"
      :show-player-actions="false"
      @close="closeMenu"
    />
  </div>
</template>
