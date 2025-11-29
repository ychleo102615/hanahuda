<template>
  <!--
    RoundEndPanel - 回合結束面板

    @description
    顯示回合結束資訊（RoundScored / RoundEndedInstantly / RoundDrawn）並自動倒數關閉。

    需求：
    - 顯示回合結束資訊
    - 底部顯示「下一回合倒數：X 秒」
    - 倒數歸零時自動關閉
    - 不允許提前跳過（無關閉按鈕，攔截背景點擊和 ESC 鍵）
  -->
  <Transition name="modal-fade">
    <div
      v-if="shouldShowPanel"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60"
      role="dialog"
      aria-modal="true"
      aria-labelledby="round-end-title"
      @click.prevent
      @keydown.esc.prevent
    >
      <div
        class="bg-white rounded-lg shadow-2xl max-w-md w-full mx-4 overflow-hidden transform transition-all"
        @click.stop
      >
        <!-- Header -->
        <div
          :class="[
            'px-6 py-5 text-white',
            headerClass,
          ]"
        >
          <h2 id="round-end-title" class="text-2xl font-bold text-center">
            {{ headerTitle }}
          </h2>
        </div>

        <!-- Body -->
        <div class="px-6 py-6 space-y-4">
          <!-- Content based on panel type -->
          <div v-if="panelType === 'roundDrawn'" class="text-center">
            <p class="text-lg font-medium text-gray-800 mb-4">
              引き分け (Draw)
            </p>
            <div class="bg-gray-50 rounded-lg p-4 space-y-2">
              <h3 class="text-sm font-semibold text-gray-700 mb-3">
                Current Scores
              </h3>
              <div
                v-for="score in uiState.roundDrawnScores"
                :key="score.player_id"
                class="flex items-center justify-between py-2 border-b border-gray-200 last:border-0"
              >
                <span class="text-gray-700 font-medium">
                  {{ getPlayerName(score.player_id) }}
                </span>
                <span class="text-xl font-bold text-gray-600">
                  {{ score.score }}
                </span>
              </div>
            </div>
          </div>

          <!-- Placeholder for other panel types (will be implemented) -->
          <div v-else class="text-center text-gray-600">
            <p>Round ended</p>
          </div>
        </div>

        <!-- Footer: Countdown Display -->
        <div class="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div class="flex items-center justify-center gap-2 text-gray-700">
            <span class="text-sm font-medium">Next round in:</span>
            <span
              :class="[
                'text-2xl font-bold tabular-nums',
                countdownWarningClass,
              ]"
            >
              {{ displayCountdown }}
            </span>
            <span class="text-sm">s</span>
          </div>
          <p class="text-xs text-gray-500 text-center mt-2">
            Please wait for the countdown to finish
          </p>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useUIStateStore } from '../../../user-interface/adapter/stores/uiState'
import { useGameStateStore } from '../../../user-interface/adapter/stores/gameState'

const uiState = useUIStateStore()
const gameState = useGameStateStore()

const { displayTimeoutRemaining, roundDrawnVisible } = storeToRefs(uiState)

/**
 * 判斷面板類型
 */
const panelType = computed<'roundScored' | 'roundEndedInstantly' | 'roundDrawn' | null>(() => {
  if (roundDrawnVisible.value) {
    return 'roundDrawn'
  }
  // TODO: Add detection for roundScored and roundEndedInstantly when implemented
  return null
})

/**
 * 是否應該顯示面板
 */
const shouldShowPanel = computed(() => {
  return panelType.value !== null && displayTimeoutRemaining.value !== null
})

/**
 * 顯示的倒數秒數
 */
const displayCountdown = computed(() => {
  return displayTimeoutRemaining.value ?? 0
})

/**
 * Header 樣式類別
 */
const headerClass = computed(() => {
  switch (panelType.value) {
    case 'roundScored':
      return 'bg-gradient-to-r from-yellow-500 to-yellow-600'
    case 'roundEndedInstantly':
      return 'bg-gradient-to-r from-blue-500 to-blue-600'
    case 'roundDrawn':
      return 'bg-gradient-to-r from-gray-500 to-gray-600'
    default:
      return 'bg-gradient-to-r from-gray-500 to-gray-600'
  }
})

/**
 * Header 標題
 */
const headerTitle = computed(() => {
  switch (panelType.value) {
    case 'roundScored':
      return 'Round Complete'
    case 'roundEndedInstantly':
      return 'Round Ended'
    case 'roundDrawn':
      return 'Round Draw'
    default:
      return 'Round End'
  }
})

/**
 * 倒數警示樣式（低於 5 秒時顯示紅色）
 */
const countdownWarningClass = computed(() => {
  const remaining = displayTimeoutRemaining.value ?? 0
  return remaining < 5 ? 'text-red-500' : 'text-gray-800'
})

/**
 * 取得玩家名稱
 */
function getPlayerName(playerId: string): string {
  const localPlayerId = gameState.getLocalPlayerId()
  return playerId === localPlayerId ? 'You' : 'Opponent'
}
</script>

<style scoped>
/* Modal fade transition */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-active .bg-white,
.modal-fade-leave-active .bg-white {
  transition: transform 0.3s ease;
}

.modal-fade-enter-from .bg-white,
.modal-fade-leave-to .bg-white {
  transform: scale(0.9);
}

/* Tabular numbers for consistent countdown width */
.tabular-nums {
  font-variant-numeric: tabular-nums;
}
</style>
